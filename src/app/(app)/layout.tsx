'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useCallback } from 'react';
import { AuthGuard } from '@/lib/auth-guard';
import { useAuthStore } from '@/lib/auth-store';
import { createAjentifyProxyHandler } from '@/lib/ajentify-proxy';
import { createWorkoutTools } from '@/lib/ajentify-tools';
import { AjentifyProvider } from '@ajentify/chat';
import { ChatPanel } from '@ajentify/chat/ui';
import { TrainerSession, TrainerSessionHost } from '@/components/trainer-session';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dumbbell, LayoutDashboard, Calendar, User, LogOut, ChevronUp, MessageCircle } from 'lucide-react';
import { FeedbackDialog } from '@/components/feedback-dialog';

const navItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Calendar', href: '/calendar', icon: Calendar },
  { title: 'Profile', href: '/profile', icon: User },
];

function NavItems({ pathname }: { pathname: string }) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            render={<Link href={item.href} />}
            isActive={pathname === item.href}
            tooltip={item.title}
            onClick={() => setOpenMobile(false)}
          >
            <item.icon />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const getAccessToken = useCallback(() => useAuthStore.getState().accessToken, []);

  const onProxy = useMemo(() => createAjentifyProxyHandler(getAccessToken), [getAccessToken]);
  const clientSideTools = useMemo(() => createWorkoutTools((p) => router.push(p)), [router]);

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '??';

  return (
    <AjentifyProvider
      config={{
        onAjentifyProxyRequest: onProxy,
        clientSideTools,
        themeBridge: 'shadcn',
        panelDefaultOpen: false,
      }}
    >
      <SidebarProvider>
        <Sidebar variant="inset" collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  render={<Link href="/dashboard" />}
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Dumbbell className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Ajentify</span>
                    <span className="truncate text-xs text-muted-foreground">Workout</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <NavItems pathname={pathname} />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <SidebarMenuButton
                        size="lg"
                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                      />
                    }
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user?.first_name} {user?.last_name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user?.email}
                      </span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                    side="top"
                    align="start"
                    sideOffset={4}
                  >
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <User className="mr-2 size-4" />
                      Profile
                    </DropdownMenuItem>
                    <FeedbackDialog>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <MessageCircle className="mr-2 size-4" />
                        Send Feedback
                      </DropdownMenuItem>
                    </FeedbackDialog>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 size-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-sm font-medium">
              {navItems.find((n) => n.href === pathname)?.title ?? 'Ajentify Workout'}
            </h1>
          </header>
          <ChatPanel desktopVariant="inline" inputPlaceholder="Ask your trainer...">
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </ChatPanel>
        </SidebarInset>
        <TrainerSession />
        <TrainerSessionHost />
      </SidebarProvider>
    </AjentifyProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
