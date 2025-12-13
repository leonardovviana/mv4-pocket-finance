import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { supabase } from '@/integrations/supabase/client';
import { IOSPage } from '@/components/IOSPage';
import { IOSCard } from '@/components/IOSCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, LogOut, User, Phone, Mail, ChevronLeft, Sun, Moon, Monitor } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o perfil',
        variant: 'destructive',
      });
    } else if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone,
      })
      .eq('id', user.id);
    
    setSaving(false);
    
    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o perfil',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso',
      });
      fetchProfile();
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer upload da imagem',
        variant: 'destructive',
      });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    setUploading(false);

    if (updateError) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o avatar',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Avatar atualizado com sucesso',
      });
      fetchProfile();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const themeOptions = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Escuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
  ] as const;

  if (loading) {
    return (
      <IOSPage title="Perfil">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </IOSPage>
    );
  }

  return (
    <IOSPage 
      title="Perfil"
      headerLeft={
        <button onClick={() => navigate(-1)} className="flex items-center text-primary">
          <ChevronLeft className="h-5 w-5" />
          <span>Voltar</span>
        </button>
      }
    >
      <div className="space-y-6 pb-24">
        {/* Avatar Section */}
        <div className="flex flex-col items-center py-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
              ) : (
                <Camera className="h-4 w-4 text-primary-foreground" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Toque para alterar a foto
          </p>
        </div>

        {/* Profile Form */}
        <IOSCard>
          <div className="space-y-4">
            <div className="flex items-center gap-3 py-3 border-b border-border/50">
              <User className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Nome completo</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  className="border-0 p-0 h-auto text-base bg-transparent focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 py-3 border-b border-border/50">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-base text-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 py-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="border-0 p-0 h-auto text-base bg-transparent focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        </IOSCard>

        {/* Theme Selection */}
        <IOSCard>
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Aparência</Label>
            <div className="flex gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`flex-1 flex flex-col items-center gap-2 py-3 px-4 rounded-xl transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Tema atual: {resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}
            </p>
          </div>
        </IOSCard>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-xl text-base font-medium"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'Salvar alterações'
          )}
        </Button>

        {/* Sign Out */}
        <IOSCard className="mt-6">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 text-destructive"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sair da conta</span>
          </button>
        </IOSCard>
      </div>
    </IOSPage>
  );
}
