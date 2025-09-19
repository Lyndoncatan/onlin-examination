import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Award } from 'lucide-react';

interface ExamCardProps {
  exam: {
    id: string;
    title: string;
    description: string;
    duration_minutes: number;
    total_marks: number;
    passing_marks: number;
    is_active: boolean;
    subject?: {
      name: string;
    };
  };
  onStartExam: (examId: string) => void;
  hasAttempted?: boolean;
  lastScore?: number;
}

export const ExamCard = ({ exam, onStartExam, hasAttempted, lastScore }: ExamCardProps) => {
  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 90) return 'text-score-excellent';
    if (percentage >= 75) return 'text-score-good';
    if (percentage >= 60) return 'text-score-average';
    return 'text-score-poor';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg text-foreground">{exam.title}</CardTitle>
            <CardDescription className="mt-1">{exam.description}</CardDescription>
            {exam.subject && (
              <Badge variant="secondary" className="mt-2">
                {exam.subject.name}
              </Badge>
            )}
          </div>
          <Badge variant={exam.is_active ? "default" : "secondary"}>
            {exam.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{exam.duration_minutes} min</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{exam.total_marks} marks</span>
          </div>
          <div className="flex items-center gap-1">
            <Award className="h-4 w-4" />
            <span>Pass: {exam.passing_marks}</span>
          </div>
        </div>

        {hasAttempted && lastScore !== undefined && (
          <div className="mb-4 p-3 bg-secondary rounded-lg">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span className="text-sm font-medium">Last Score:</span>
              <span className={`font-bold ${getScoreColor(lastScore, exam.total_marks)}`}>
                {lastScore}/{exam.total_marks}
              </span>
              <span className="text-sm text-muted-foreground">
                ({Math.round((lastScore / exam.total_marks) * 100)}%)
              </span>
            </div>
          </div>
        )}

        <Button 
          onClick={() => onStartExam(exam.id)} 
          className="w-full" 
          disabled={!exam.is_active}
        >
          {hasAttempted ? 'Retake Exam' : 'Start Exam'}
        </Button>
      </CardContent>
    </Card>
  );
};