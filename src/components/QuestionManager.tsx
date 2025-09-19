import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, FileQuestion } from 'lucide-react';

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

interface QuestionManagerProps {
  examId: string;
  examTitle: string;
}

export const QuestionManager = ({ examId, examTitle }: QuestionManagerProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: '',
    marks: 1,
    order_number: 1
  });

  useEffect(() => {
    fetchQuestions();
  }, [examId]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_number', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuestionForm({
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: '',
      marks: 1,
      order_number: questions.length + 1
    });
    setEditingQuestion(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!questionForm.correct_answer) {
      toast.error('Please select the correct answer');
      return;
    }

    try {
      if (editingQuestion) {
        const { error } = await supabase
          .from('questions')
          .update(questionForm)
          .eq('id', editingQuestion.id);

        if (error) throw error;
        toast.success('Question updated successfully');
      } else {
        const { error } = await supabase
          .from('questions')
          .insert({
            ...questionForm,
            exam_id: examId
          });

        if (error) throw error;
        toast.success('Question created successfully');
      }

      fetchQuestions();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Failed to save question');
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setQuestionForm({
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
      marks: question.marks,
      order_number: question.order_number
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      toast.success('Question deleted successfully');
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const updateExamTotalMarks = async () => {
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    try {
      const { error } = await supabase
        .from('exams')
        .update({ total_marks: totalMarks })
        .eq('id', examId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating exam total marks:', error);
    }
  };

  useEffect(() => {
    if (questions.length > 0) {
      updateExamTotalMarks();
    }
  }, [questions]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5" />
              Questions for "{examTitle}"
            </CardTitle>
            <CardDescription>
              Manage questions and answers for this exam ({questions.length} questions)
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingQuestion ? 'Edit Question' : 'Add New Question'}
                </DialogTitle>
                <DialogDescription>
                  Create a multiple choice question with four options.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="marks">Marks</Label>
                    <Input
                      id="marks"
                      type="number"
                      min="1"
                      value={questionForm.marks}
                      onChange={(e) => setQuestionForm({...questionForm, marks: parseInt(e.target.value) || 1})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="order">Order</Label>
                    <Input
                      id="order"
                      type="number"
                      min="1"
                      value={questionForm.order_number}
                      onChange={(e) => setQuestionForm({...questionForm, order_number: parseInt(e.target.value) || 1})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="question">Question</Label>
                  <Textarea
                    id="question"
                    value={questionForm.question_text}
                    onChange={(e) => setQuestionForm({...questionForm, question_text: e.target.value})}
                    required
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="option-a">Option A</Label>
                    <Input
                      id="option-a"
                      value={questionForm.option_a}
                      onChange={(e) => setQuestionForm({...questionForm, option_a: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="option-b">Option B</Label>
                    <Input
                      id="option-b"
                      value={questionForm.option_b}
                      onChange={(e) => setQuestionForm({...questionForm, option_b: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="option-c">Option C</Label>
                    <Input
                      id="option-c"
                      value={questionForm.option_c}
                      onChange={(e) => setQuestionForm({...questionForm, option_c: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="option-d">Option D</Label>
                    <Input
                      id="option-d"
                      value={questionForm.option_d}
                      onChange={(e) => setQuestionForm({...questionForm, option_d: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="correct-answer">Correct Answer</Label>
                  <Select
                    value={questionForm.correct_answer}
                    onValueChange={(value) => setQuestionForm({...questionForm, correct_answer: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select correct answer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - {questionForm.option_a || 'Option A'}</SelectItem>
                      <SelectItem value="B">B - {questionForm.option_b || 'Option B'}</SelectItem>
                      <SelectItem value="C">C - {questionForm.option_c || 'Option C'}</SelectItem>
                      <SelectItem value="D">D - {questionForm.option_d || 'Option D'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingQuestion ? 'Update Question' : 'Create Question'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No questions added yet. Click "Add Question" to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Q{question.order_number}</Badge>
                      <Badge variant="secondary">{question.marks} marks</Badge>
                    </div>
                    <p className="font-medium text-foreground mb-3">{question.question_text}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className={`p-2 rounded ${question.correct_answer === 'A' ? 'bg-green-100 dark:bg-green-900/20 border-green-200' : 'bg-muted'}`}>
                        <span className="font-medium">A:</span> {question.option_a}
                      </div>
                      <div className={`p-2 rounded ${question.correct_answer === 'B' ? 'bg-green-100 dark:bg-green-900/20 border-green-200' : 'bg-muted'}`}>
                        <span className="font-medium">B:</span> {question.option_b}
                      </div>
                      <div className={`p-2 rounded ${question.correct_answer === 'C' ? 'bg-green-100 dark:bg-green-900/20 border-green-200' : 'bg-muted'}`}>
                        <span className="font-medium">C:</span> {question.option_c}
                      </div>
                      <div className={`p-2 rounded ${question.correct_answer === 'D' ? 'bg-green-100 dark:bg-green-900/20 border-green-200' : 'bg-muted'}`}>
                        <span className="font-medium">D:</span> {question.option_d}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(question)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(question.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};