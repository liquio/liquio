import React from 'react';
import { useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import { deleteCabinetMenuItem, type CabinetMenuItem } from '../helpers/actions';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface DeleteCabinetMenuItemDialogProps {
  open: boolean;
  onClose?: () => void;
  onAction?: (action: { type: string; id?: string }) => void;
  value?: CabinetMenuItem;
}

const DeleteCabinetMenuItemDialog = ({
  open,
  onClose,
  onAction,
  value,
}: DeleteCabinetMenuItemDialogProps) => {
  const t = useTranslate('CabinetMenuPage');
  const dispatch = useDispatch();

  const handleDelete = async () => {
    if (value?.options?.system) {
      onClose?.();
      return;
    }

    await deleteCabinetMenuItem(value as CabinetMenuItem, dispatch as never);
    onAction?.({
      type: 'delete',
      id: value?.id,
    });
    onClose?.();
  };

  return (
    <ConfirmDialog
      open={open}
      title={t('DeletePrompt')}
      description={t('DeletePromptDescription', { name: value?.name || '-' })}
      handleClose={onClose}
      handleConfirm={handleDelete}
      darkTheme={true}
    />
  );
};

export default DeleteCabinetMenuItemDialog;
