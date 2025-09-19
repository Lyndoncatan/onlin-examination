import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { ExamCard } from '@/components/ExamCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Trophy, Clock, BookOpen } from 'lucide-react';

const Dashboard = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalExams: 0,
    completedExams: 0,
    averageScore: 0,
    bestScore: 0
  });

  useEffect(() => {
    if (user) {
      fetchExams();
      fetchAttempts();
    }
  }, [user]);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          subjects(name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
      setStats(prev => ({ ...prev, totalExams: data?.length || 0 }));
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Failed to load exams');
    }
  };

  const fetchAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          exams(title, total_marks)
        `)
        .eq('student_id', user?.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) throw error;
      
      setAttempts(data || []);
      
      // Calculate stats
      if (data && data.length > 0) {
        const completedExams = data.length;
        const totalScore = data.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
        const averageScore = Math.round(totalScore / completedExams);
        const bestScore = Math.max(...data.map(attempt => attempt.score || 0));
        
        setStats(prev => ({
          ...prev,
          completedExams,
          averageScore,
          bestScore
        }));
      }
    } catch (error) {
      console.error('Error fetching attempts:', error);
      toast.error('Failed to load exam history');
    } finally {
      setLoading(false);
    }
  };

  const startExam = async (examId: string) => {
    try {
      // Check if there's an active attempt
      const { data: activeAttempt } = await supabase
        .from('exam_attempts')
        .select('id')
        .eq('exam_id', examId)
        .eq('student_id', user?.id)
        .eq('status', 'in_progress')
        .single();

      if (activeAttempt) {
        navigate(`/exam/${examId}`);
        return;
      }

      // Get exam details for total_marks
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('total_marks')
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      // Create new attempt
      const { data: newAttempt, error } = await supabase
        .from('exam_attempts')
        .insert({
          exam_id: examId,
          student_id: user?.id,
          status: 'in_progress',
          total_marks: examData.total_marks
        })
        .select()
        .single();

      if (error) throw error;
      
      navigate(`/exam/${examId}`);
    } catch (error) {
      console.error('Error starting exam:', error);
      toast.error('Failed to start exam');
    }
  };

  const getLastAttemptScore = (examId: string) => {
    const lastAttempt = attempts.find(attempt => attempt.exam_id === examId);
    return lastAttempt?.score;
  };

  const hasAttempted = (examId: string) => {
    return attempts.some(attempt => attempt.exam_id === examId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {userProfile?.full_name || user?.email}!
          </h1>
          <p className="text-muted-foreground">
            Ready to take your next exam? Check out the available exams below.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalExams}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.completedExams}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.averageScore}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Score</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.bestScore}</div>
            </CardContent>
          </Card>
        </div>

        {/* Available Exams */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Available Exams</h2>
          {exams.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No exams available at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  onStartExam={startExam}
                  hasAttempted={hasAttempted(exam.id)}
                  lastScore={getLastAttemptScore(exam.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Attempts */}
        {attempts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Recent Exam Results</h2>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {attempts.slice(0, 5).map((attempt, index) => (
                    <div key={attempt.id} className="p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">
                          {attempt.exams?.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Completed on {new Date(attempt.completed_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {attempt.score}/{attempt.total_marks}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round((attempt.score / attempt.total_marks) * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;