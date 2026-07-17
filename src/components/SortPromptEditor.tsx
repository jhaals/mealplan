import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';

interface SortPromptEditorProps {
  currentPrompt: string;
  defaultPrompt: string;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (prompt: string) => Promise<void>;
  onReset: () => void;
}

export function SortPromptEditor({
  currentPrompt,
  defaultPrompt,
  isLoading,
  isSaving,
  onSave,
  onReset,
}: SortPromptEditorProps) {
  const { t } = useTranslation();
  const [editedPrompt, setEditedPrompt] = useState(currentPrompt);
  const [showDefault, setShowDefault] = useState(false);
  const fieldId = useId();

  const handleSave = async () => {
    await onSave(editedPrompt.trim());
  };

  const handleReset = async () => {
    setEditedPrompt('');
    await onSave('');
    onReset();
  };

  const isCustom = currentPrompt.trim() !== '';
  const hasChanges = editedPrompt.trim() !== currentPrompt.trim();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span
          className="inline-block h-8 w-8 rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--color-accent-2)', borderTopColor: 'transparent', animation: 'hum-spin 700ms linear infinite' }}
          aria-label={t('buttons.saving')}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 style={{ fontSize: 'var(--text-lg)' }}>{t('sortPrompt.title')}</h3>
          <span className={`chip ${isCustom ? 'tint-cyan' : 'tint-pear'}`}>
            {isCustom ? t('sortPrompt.customLabel') : t('sortPrompt.defaultLabel')}
          </span>
        </div>
        <p className="text-sm text-muted mt-2 max-w-prose">{t('sortPrompt.description')}</p>
      </div>

      <div>
        <label htmlFor={fieldId} className="mono-label block mb-1.5">
          {t('sortPrompt.customInstructions')}
        </label>
        <textarea
          id={fieldId}
          value={editedPrompt}
          onChange={(e) => setEditedPrompt(e.target.value)}
          placeholder={t('sortPrompt.placeholder')}
          rows={12}
          className="field"
          style={{ fontFamily: 'var(--font-label)', fontSize: 'var(--text-sm)', resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={handleSave} disabled={!hasChanges} loading={isSaving}>
          {t('sortPrompt.savePrompt')}
        </Button>
        <Button variant="secondary" onClick={handleReset} disabled={isSaving || !isCustom}>
          {t('sortPrompt.resetToDefault')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowDefault(!showDefault)} aria-expanded={showDefault}>
          {showDefault ? t('sortPrompt.hide') : t('sortPrompt.show')} {t('sortPrompt.showDefaultPrompt')}
        </Button>
      </div>

      {showDefault && defaultPrompt && (
        <div className="card p-4" style={{ background: 'var(--color-paper-2)', boxShadow: 'none' }}>
          <h4 className="mono-label mb-2">{t('sortPrompt.defaultPrompt')}</h4>
          {/* Wide content scrolls inside its own container — the page body
            * must never scroll horizontally. */}
          <pre
            className="custom-scrollbar text-xs text-muted whitespace-pre-wrap overflow-x-auto overflow-y-auto"
            style={{ fontFamily: 'var(--font-label)', maxHeight: '24rem', lineHeight: 1.6 }}
          >
            {defaultPrompt}
          </pre>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditedPrompt(defaultPrompt)}>
            {t('sortPrompt.copyToEditor')}
          </Button>
        </div>
      )}
    </div>
  );
}
