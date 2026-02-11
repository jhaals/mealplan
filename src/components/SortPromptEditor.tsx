import { useState } from 'react';

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
  const [editedPrompt, setEditedPrompt] = useState(currentPrompt);
  const [showDefault, setShowDefault] = useState(false);

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
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          AI Sorting Prompt
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Customize how Gemini AI sorts your shopping list items. Leave empty to use the default Swedish store layout.
        </p>
      </div>

      {/* Current Status */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Prompt:
          </span>
          <span className="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {isCustom ? 'Custom' : 'Default (Swedish store layout)'}
          </span>
        </div>
      </div>

      {/* Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Custom Sorting Instructions
        </label>
        <textarea
          value={editedPrompt}
          onChange={(e) => setEditedPrompt(e.target.value)}
          placeholder="Enter custom sorting instructions for Gemini AI, or leave empty to use default..."
          rows={14}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-vertical"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Prompt'}
        </button>
        <button
          onClick={handleReset}
          disabled={isSaving || !isCustom}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset to Default
        </button>
        <button
          onClick={() => setShowDefault(!showDefault)}
          className="px-4 py-2 text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
        >
          {showDefault ? 'Hide' : 'Show'} Default Prompt
        </button>
      </div>

      {/* Default Prompt Display */}
      {showDefault && defaultPrompt && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Default Prompt (Swedish Store Layout)
          </h4>
          <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono overflow-x-auto max-h-96 overflow-y-auto">
            {defaultPrompt}
          </pre>
          <button
            onClick={() => setEditedPrompt(defaultPrompt)}
            className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Copy to Editor
          </button>
        </div>
      )}
    </div>
  );
}
