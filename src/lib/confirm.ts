'use client';

import Swal from 'sweetalert2';

export async function confirmAction({
  title,
  text,
  confirmButtonText,
  destructive = false,
  onConfirm,
}: {
  title: string;
  text: string;
  confirmButtonText: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
}) {
  await Swal.fire({
    position: 'center',
    titleText: title,
    text,
    icon: destructive ? 'warning' : 'question',
    iconColor: destructive ? '#a03e38' : '#284d3d',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Cancelar',
    focusCancel: true,
    reverseButtons: true,
    buttonsStyling: false,
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    allowEscapeKey: () => !Swal.isLoading(),
    customClass: {
      popup: 'action-confirm',
      title: 'action-confirm-title',
      htmlContainer: 'action-confirm-text',
      actions: 'action-confirm-actions',
      confirmButton: 'button' + (destructive ? ' button-danger' : ''),
      cancelButton: 'button button-outline',
    },
    preConfirm: async () => {
      try {
        await onConfirm();
        return true;
      } catch (error) {
        // O Swal interpreta HTML na validação; trate mensagens da API como texto.
        const message = document.createElement('div');
        message.textContent =
          error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.';
        Swal.showValidationMessage(message.innerHTML);
        return false;
      }
    },
  });
}
