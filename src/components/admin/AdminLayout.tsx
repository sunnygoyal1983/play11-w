import { ReactNode } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
} from '@mui/material';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect if not authenticated or not admin
  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session?.user || session.user.role !== 'ADMIN') {
    router.push('/');
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Admin Dashboard
          </Typography>
          <Button color="inherit" component={Link} href="/admin">
            Dashboard
          </Button>
          <Button color="inherit" component={Link} href="/admin/contests">
            Contests
          </Button>
          <Button color="inherit" component={Link} href="/admin/users">
            Users
          </Button>
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ mt: 4, mb: 4, flex: 1 }}>
        {children}
      </Container>
    </Box>
  );
}
