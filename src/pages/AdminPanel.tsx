import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Users, BookOpen, FileText, Eye, EyeOff, Edit, Trash2, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QuestionManager } from '@/components/QuestionManager';

const AdminPanel = () => {
  const { userProfile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSubjects: 0,
    totalExams: 0,
    activeExams: 0
  });

  // Form states
  const [subjectForm, setSubjectForm] = useState({ name: '', description: '', is_active: true });
  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    subject_id: '',
    duration_minutes: 60,
    total_marks: 100,
    passing_marks: 60,
    is_active: true
  });
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingExam, setEditingExam] = useState(null);
  const [selectedExamForQuestions, setSelectedExamForQuestions] = useState(null);

  useEffect(() => {
    if (user && userProfile?.role === 'admin') {
      fetchAllData();
    }
  }, [user, userProfile]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchSubjects(),
        fetchExams()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setUsers(data || []);
    setStats(prev => ({ ...prev, totalUsers: data?.length || 0 }));
  };

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setSubjects(data || []);
    setStats(prev => ({ ...prev, totalSubjects: data?.length || 0 }));
  };

  const fetchExams = async () => {
    const { data, error } = await supabase
      .from('exams')
      .select(`
        *,
        subjects(name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setExams(data || []);
    const activeExams = data?.filter(exam => exam.is_active).length || 0;
    setStats(prev => ({ 
      ...prev, 
      totalExams: data?.length || 0,
      activeExams 
    }));
  };

  const createSubject = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('subjects')
        .insert({
          ...subjectForm,
          created_by: user.id
        });

      if (error) throw error;
      
      toast.success('Subject created successfully');
      setSubjectForm({ name: '', description: '', is_active: true });
      fetchSubjects();
    } catch (error) {
      console.error('Error creating subject:', error);
      toast.error('Failed to create subject');
    }
  };

  const updateSubject = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('subjects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Subject updated successfully');
      fetchSubjects();
    } catch (error) {
      console.error('Error updating subject:', error);
      toast.error('Failed to update subject');
    }
  };

  const deleteSubject = async (id) => {
    if (!confirm('Are you sure you want to delete this subject? This will also delete all associated exams.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Subject deleted successfully');
      fetchSubjects();
      fetchExams(); // Refresh exams as they might be affected
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject');
    }
  };

  const createExam = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!examForm.subject_id) {
      toast.error('Please select a subject');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('exams')
        .insert({
          ...examForm,
          subject_id: examForm.subject_id || null, // Convert empty string to null
          created_by: user.id
        });

      if (error) throw error;
      
      toast.success('Exam created successfully');
      setExamForm({
        title: '',
        description: '',
        subject_id: '',
        duration_minutes: 60,
        total_marks: 100,
        passing_marks: 60,
        is_active: true
      });
      fetchExams();
    } catch (error) {
      console.error('Error creating exam:', error);
      toast.error('Failed to create exam');
    }
  };

  const updateExam = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('exams')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Exam updated successfully');
      fetchExams();
    } catch (error) {
      console.error('Error updating exam:', error);
      toast.error('Failed to update exam');
    }
  };

  const deleteExam = async (id) => {
    if (!confirm('Are you sure you want to delete this exam? This will also delete all associated questions and attempts.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Exam deleted successfully');
      fetchExams();
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error('Failed to delete exam');
    }
  };

  const toggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'student' : 'admin';
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  if (userProfile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <Card>
            <CardContent className="text-center py-8">
              <h2 className="text-xl font-bold text-destructive mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You need admin privileges to access this page.</p>
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, subjects, and exams</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalSubjects}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalExams}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Exams</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.activeExams}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="subjects">Subject Management</TabsTrigger>
            <TabsTrigger value="exams">Exam Management</TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium text-foreground">{user.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleUserRole(user.id, user.role)}
                        >
                          {user.role === 'admin' ? 'Make Student' : 'Make Admin'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subject Management Tab */}
          <TabsContent value="subjects">
            <div className="space-y-6">
              {/* Create Subject Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Create New Subject</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createSubject} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="subject-name">Subject Name</Label>
                        <Input
                          id="subject-name"
                          value={subjectForm.name}
                          onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="subject-active"
                          checked={subjectForm.is_active}
                          onCheckedChange={(checked) => setSubjectForm({...subjectForm, is_active: checked})}
                        />
                        <Label htmlFor="subject-active">Active</Label>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="subject-description">Description</Label>
                      <Textarea
                        id="subject-description"
                        value={subjectForm.description}
                        onChange={(e) => setSubjectForm({...subjectForm, description: e.target.value})}
                      />
                    </div>
                    <Button type="submit">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Subject
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Subjects List */}
              <Card>
                <CardHeader>
                  <CardTitle>Manage Subjects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {subjects.map((subject) => (
                      <div key={subject.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium text-foreground">{subject.name}</h3>
                          <p className="text-sm text-muted-foreground">{subject.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Created: {new Date(subject.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={subject.is_active ? 'default' : 'secondary'}>
                            {subject.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateSubject(subject.id, { is_active: !subject.is_active })}
                          >
                            {subject.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteSubject(subject.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Exam Management Tab */}
          <TabsContent value="exams">
            <div className="space-y-6">
              {/* Create Exam Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Create New Exam</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createExam} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="exam-title">Exam Title</Label>
                        <Input
                          id="exam-title"
                          value={examForm.title}
                          onChange={(e) => setExamForm({...examForm, title: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="exam-subject">Subject</Label>
                        <Select
                          value={examForm.subject_id}
                          onValueChange={(value) => setExamForm({...examForm, subject_id: value})}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.filter(s => s.is_active).map((subject) => (
                              <SelectItem key={subject.id} value={subject.id}>
                                {subject.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="exam-description">Description</Label>
                      <Textarea
                        id="exam-description"
                        value={examForm.description}
                        onChange={(e) => setExamForm({...examForm, description: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="exam-duration">Duration (minutes)</Label>
                        <Input
                          id="exam-duration"
                          type="number"
                          value={examForm.duration_minutes}
                          onChange={(e) => setExamForm({...examForm, duration_minutes: parseInt(e.target.value)})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="exam-total-marks">Total Marks</Label>
                        <Input
                          id="exam-total-marks"
                          type="number"
                          value={examForm.total_marks}
                          onChange={(e) => setExamForm({...examForm, total_marks: parseInt(e.target.value)})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="exam-passing-marks">Passing Marks</Label>
                        <Input
                          id="exam-passing-marks"
                          type="number"
                          value={examForm.passing_marks}
                          onChange={(e) => setExamForm({...examForm, passing_marks: parseInt(e.target.value)})}
                          required
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="exam-active"
                          checked={examForm.is_active}
                          onCheckedChange={(checked) => setExamForm({...examForm, is_active: checked})}
                        />
                        <Label htmlFor="exam-active">Active</Label>
                      </div>
                    </div>
                    
                    <Button type="submit">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Exam
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Exams List */}
              <Card>
                <CardHeader>
                  <CardTitle>Manage Exams</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {exams.map((exam) => (
                      <div key={exam.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium text-foreground">{exam.title}</h3>
                          <p className="text-sm text-muted-foreground">{exam.description}</p>
                          <div className="text-xs text-muted-foreground space-x-4">
                            <span>Subject: {exam.subjects?.name}</span>
                            <span>Duration: {exam.duration_minutes}min</span>
                            <span>Marks: {exam.total_marks}</span>
                            <span>Pass: {exam.passing_marks}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={exam.is_active ? 'default' : 'secondary'}>
                            {exam.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedExamForQuestions(exam)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateExam(exam.id, { is_active: !exam.is_active })}
                          >
                            {exam.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteExam(exam.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Question Management */}
              {selectedExamForQuestions && (
                <QuestionManager
                  examId={selectedExamForQuestions.id}
                  examTitle={selectedExamForQuestions.title}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPanel;