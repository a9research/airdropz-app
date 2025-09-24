import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title?: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export function useToastSonner() {
  const toast = ({ title, description, type = 'info', duration = 4000 }: ToastOptions) => {
    const message = title && description ? `${title}: ${description}` : title || description || '';
    
    switch (type) {
      case 'success':
        sonnerToast.success(message, { duration });
        break;
      case 'error':
        sonnerToast.error(message, { duration });
        break;
      case 'warning':
        sonnerToast.warning(message, { duration });
        break;
      default:
        sonnerToast(message, { duration });
    }
  };

  return { toast };
}
