import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { X } from 'lucide-react';

const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  panelClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}) => {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    document.body.classList.add('modal-open');

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [open]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={clsx('modal-panel', `modal-${size}`, panelClassName)}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.985 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={clsx('modal-header', headerClassName)}>
              <div>
                <h3>{title}</h3>
                {description ? <p>{description}</p> : null}
              </div>
              <button className="icon-button" type="button" onClick={onClose} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <div className={clsx('modal-body', bodyClassName)}>{children}</div>
            {footer ? <div className={clsx('modal-footer', footerClassName)}>{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};

export { Modal };
