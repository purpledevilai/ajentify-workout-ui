'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2, User, Activity, Target, AlertTriangle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Profile {
  age?: number;
  height?: number;
  weight?: number;
  gender?: string;
  units_preference?: 'imperial' | 'metric';
  goals?: string[];
  environment?: string;
  injuries?: string;
  trainer_notes?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<{ profile: Profile }>('/profile')
      .then((res) => setProfile(res.profile ?? {}))
      .catch(() => setProfile({}))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await api.put('/profile', profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  function handleAddGoal() {
    if (!newGoal.trim()) return;
    setProfile((p) => ({ ...p, goals: [...(p.goals ?? []), newGoal.trim()] }));
    setNewGoal('');
  }

  function handleRemoveGoal(index: number) {
    setProfile((p) => ({ ...p, goals: (p.goals ?? []).filter((_, i) => i !== index) }));
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
          <p className="text-muted-foreground">Manage your fitness profile and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saved ? 'Saved!' : 'Save'}
        </Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4" />
                Personal Info
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input value={user?.first_name ?? ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input value={user?.last_name ?? ''} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Units</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={profile.units_preference === 'imperial' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setProfile((p) => ({ ...p, units_preference: 'imperial' }))}
                  >
                    Imperial (lbs/ft)
                  </Button>
                  <Button
                    type="button"
                    variant={profile.units_preference === 'metric' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setProfile((p) => ({ ...p, units_preference: 'metric' }))}
                  >
                    Metric (kg/cm)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="body" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4" />
                Body Stats
              </CardTitle>
              <CardDescription>Used to personalize your workout plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
                    value={profile.age ?? ''}
                    onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Input
                    id="gender"
                    placeholder="e.g. Male, Female, Non-binary"
                    value={profile.gender ?? ''}
                    onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">
                    Height ({profile.units_preference === 'metric' ? 'cm' : 'inches'})
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder={profile.units_preference === 'metric' ? '175' : '70'}
                    value={profile.height ?? ''}
                    onChange={(e) => setProfile((p) => ({ ...p, height: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">
                    Weight ({profile.units_preference === 'metric' ? 'kg' : 'lbs'})
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder={profile.units_preference === 'metric' ? '75' : '165'}
                    value={profile.weight ?? ''}
                    onChange={(e) => setProfile((p) => ({ ...p, weight: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4" />
                Goals & Environment
              </CardTitle>
              <CardDescription>Help your trainer understand what you want to achieve</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Fitness Goals</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(profile.goals ?? []).map((goal, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {goal}
                      <button
                        onClick={() => handleRemoveGoal(i)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        &times;
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a goal (e.g. Build muscle)"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGoal())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddGoal}>Add</Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="environment">Training Environment</Label>
                <Textarea
                  id="environment"
                  placeholder="Describe where you train (e.g. Home gym with dumbbells and bench, commercial gym, etc.)"
                  value={profile.environment ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, environment: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="injuries" className="flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-destructive" />
                  Injuries / Limitations
                </Label>
                <Textarea
                  id="injuries"
                  placeholder="Any injuries, pain points, or movements to avoid..."
                  value={profile.injuries ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, injuries: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Trainer Notes</CardTitle>
              <CardDescription>Notes from your AI trainer about your progress</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.trainer_notes ? (
                <div className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap">
                  {profile.trainer_notes}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No trainer notes yet. Start a conversation with your AI trainer to get personalized feedback.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator className="my-6" />

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="size-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data including workouts, profile, and calendar entries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="destructive" disabled={deleting} className="gap-2" />}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete Account
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account, profile, all workouts, and calendar data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await api.delete('/me');
                      clearAuth();
                      router.push('/login');
                    } catch {
                      setDeleting(false);
                    }
                  }}
                >
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
