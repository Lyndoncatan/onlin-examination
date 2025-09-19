import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  marks: number;
  order_number: number;
}

interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  status: string;
  started_at: string;
  total_marks: number;
}

const Exam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<ExamAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && userProfile && examId) {
      fetchExamData();
    }
  }, [user, userProfile, examId]);

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && currentAttempt) {
      // Time's up, auto-submit
      handleSubmitExam();
    }
  }, [timeRemaining, currentAttempt]);

  const fetchExamData = async () => {
    try {
      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select(`
          *,
          subjects(name)
        `)
        .eq('id', examId)
        .single();

      if (examError) throw examError;
      if (!examData.is_active) {
        toast.error('This exam is not currently active');
        navigate('/dashboard');
        return;
      }

      setExam(examData);

      // Check for existing attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .eq('status', 'in_progress')
        .single();

      if (attemptError && attemptError.code !== 'PGRST116') {
        throw attemptError;
      }

      if (attemptData) {
        // Resume existing attempt
        setCurrentAttempt(attemptData);
        const startTime = new Date(attemptData.started_at).getTime();
        const now = Date.now();
        const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
        const remainingMinutes = Math.max(0, examData.duration_minutes - elapsedMinutes);
        setTimeRemaining(remainingMinutes * 60);

        // Fetch existing answers
        const { data: answersData, error: answersError } = await supabase
          .from('student_answers')
          .select('question_id, selected_answer')
          .eq('attempt_id', attemptData.id);

        if (answersError) throw answersError;
        
        const existingAnswers = {};
        answersData?.forEach(answer => {
          existingAnswers[answer.question_id] = answer.selected_answer;
        });
        setAnswers(existingAnswers);
      } else {
        // Create new attempt
        const { data: newAttempt, error: newAttemptError } = await supabase
          .from('exam_attempts')
          .insert({
            exam_id: examId,
            student_id: user.id,
            total_marks: examData.total_marks,
            status: 'in_progress'
          })
          .select()
          .single();

        if (newAttemptError) throw newAttemptError;
        setCurrentAttempt(newAttempt);
        setTimeRemaining(examData.duration_minutes * 60);
      }

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_number', { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

    } catch (error) {
      console.error('Error fetching exam data:', error);
      toast.error('Failed to load exam');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = async (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));

    // Save answer to database
    try {
      const { error } = await supabase
        .from('student_answers')
        .upsert({
          attempt_id: currentAttempt?.id,
          question_id: questionId,
          selected_answer: answer
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving answer:', error);
      toast.error('Failed to save answer');
    }
  };

  const handleSubmitExam = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Calculate score
      const { data: answersData, error: answersError } = await supabase
        .from('student_answers')
        .select(`
          question_id,
          selected_answer,
          questions(correct_answer, marks)
        `)
        .eq('attempt_id', currentAttempt?.id);

      if (answersError) throw answersError;

      let score = 0;
      let correctAnswers = 0;

      answersData?.forEach(answer => {
        const isCorrect = answer.selected_answer === answer.questions.correct_answer;
        if (isCorrect) {
          score += answer.questions.marks;
          correctAnswers++;
        }

        // Update the student_answers record with correctness
        supabase
          .from('student_answers')
          .update({ is_correct: isCorrect })
          .eq('attempt_id', currentAttempt?.id)
          .eq('question_id', answer.question_id)
          .then();
      });

      const percentage = exam?.total_marks ? (score / exam.total_marks) * 100 : 0;

      // Update exam attempt
      const { error: updateError } = await supabase
        .from('exam_attempts')
        .update({
          status: 'completed',
          score,
          percentage,
          completed_at: new Date().toISOString()
        })
        .eq('id', currentAttempt?.id);

      if (updateError) throw updateError;

      toast.success('Exam submitted successfully!');
      navigate('/dashboard');

    } catch (error) {
      console.error('Error submitting exam:', error);
      toast.error('Failed to submit exam');
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (userProfile?.role !== 'student') {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <Card>
            <CardContent className="text-center py-8">
              <h2 className="text-xl font-bold text-destructive mb-2">Access Denied</h2>
              <p className="text-muted-foreground">Only students can take exams.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading exam...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Exam Not Available</h2>
              <p className="text-muted-foreground">This exam is not available or has no questions.</p>
              <Button className="mt-4" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredQuestions = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Exam Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{exam.title}</CardTitle>
                <CardDescription>{exam.subjects?.name}</CardDescription>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  <span className={`font-mono text-lg ${timeRemaining < 300 ? 'text-destructive' : 'text-foreground'}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {answeredQuestions} / {questions.length} answered
                </div>
              </div>
            </div>
            <Progress value={progress} className="mt-4" />
          </CardHeader>
        </Card>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">
                Question {currentQuestionIndex + 1} of {questions.length}
              </CardTitle>
              <Badge variant="outline">{currentQuestion.marks} marks</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg font-medium">{currentQuestion.question_text}</p>
            
            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].map((option) => {
                const optionText = currentQuestion[`option_${option.toLowerCase()}`];
                const isSelected = answers[currentQuestion.id] === option;
                
                return (
                  <button
                    key={option}
                    onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected 
                          ? 'border-primary bg-primary text-primary-foreground' 
                          : 'border-border'
                      }`}>
                        {isSelected && <CheckCircle className="h-4 w-4" />}
                      </div>
                      <span className="font-medium">{option}.</span>
                      <span>{optionText}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? 'bg-primary text-primary-foreground'
                    : answers[questions[index].id]
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmitExam}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Exam'}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Next
            </Button>
          )}
        </div>

        {/* Submit Warning */}
        {answeredQuestions < questions.length && (
          <Card className="mt-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  You have {questions.length - answeredQuestions} unanswered questions.
                  Make sure to answer all questions before submitting.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Exam;