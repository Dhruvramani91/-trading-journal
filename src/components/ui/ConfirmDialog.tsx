import { forwardRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
}

export const ConfirmDialog = forwardRef<HTMLDivElement, ConfirmDialogProps>(
  (
    {
      open,
      onOpenChange,
      title,
      description,
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      onConfirm,
    },
    ref
  ) => {
    const handleConfirm = async () => {
      await onConfirm();
      onOpenChange(false);
    };

    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
        <Dialog.Portal>
          <Dialog.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-bg-0/80 backdrop-blur-sm',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              'transition-all duration-200',
            )}
          />
          <Dialog.Content
            ref={ref}
            className={cn(
              'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
              'rounded-xl border border-line bg-bg-1 p-6 shadow-pop',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
              'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
              'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
              'duration-200',
            )}
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <Dialog.Title className='text-base font-bold text-fg'>{title}</Dialog.Title>
            <Dialog.Description className='text-sm text-fg-muted mt-2'>{description}</Dialog.Description>

            <div className='flex justify-end gap-2 mt-6'>
              <Dialog.Close asChild>
                <Button variant='secondary' size='sm' onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Button
                  variant='danger'
                  size='sm'
                  onClick={handleConfirm}
                >{confirmLabel}</Button>
              </Dialog.Close>
            </div>

            <Dialog.Close asChild>
              <button
                type='button'
                className='absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-bg-4 transition-colors'
                aria-label='Close'
                onClick={() => onOpenChange(false)}
              >
                <X className='h-4 w-4' />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }
);

ConfirmDialog.displayName = 'ConfirmDialog';