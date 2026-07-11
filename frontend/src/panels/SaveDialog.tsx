import { useState, useEffect } from 'preact/hooks';
import * as bridge from '../bridge';

interface Props {
  visible: boolean;
  content: string;
  defaultName: string;
  onSave: (path: string) => void;
  onCancel: () => void;
}

export function SaveDialog({ visible, defaultName, onSave, onCancel }: Props) {
  const [dir, setDir] = useState('');
  const [entries, setEntries] = useState<bridge.FileEntry[]>([]);
  const [filename, setFilename] = useState(defaultName);
  const [filter, setFilter] = useState('');
  const [pathInput, setPathInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = (path: string) => {
    try {
      const result = bridge.listFiles(path);
      if (Array.isArray(result)) {
        setEntries(result as bridge.FileEntry[]);
        setDir(path);
        setPathInput(path);
        setFilter('');
        setError(null);
      } else {
        setError((result as any).error || 'Cannot list directory');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setFilename(defaultName);
    load('');
  }, [visible, defaultName]);

  const navigate = (entry: bridge.FileEntry) => {
    load(dir ? dir + '/' + entry.name : entry.name);
  };

  const goUp = () => {
    if (!dir) return;
    const parts = dir.split('/');
    parts.pop();
    load(parts.join('/'));
  };

  const handleSave = () => {
    if (!filename.trim()) { setError('Enter a filename'); return; }
    onSave(dir ? dir + '/' + filename.trim() : filename.trim());
  };

  if (!visible) return null;

  const q = filter.trim().toLowerCase();
  const match = (e: bridge.FileEntry) => !q || e.name.toLowerCase().includes(q);
  const dirs = entries.filter(e => e.type === 'directory' && match(e));
  const files = entries.filter(e => e.type !== 'directory' && match(e));
  const isQ = (n: string) => n.endsWith('.q') || n.endsWith('.k');

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={(e) => { if ((e.target as HTMLElement).dataset.overlay === 'true') onCancel(); }}
      data-overlay="true">
      <div style={{
        background: 'var(--bg-toolbar)', borderRadius: '6px', width: '560px', maxHeight: '600px',
        display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-bright)' }}>
          Save As
        </div>

        {/* Editable path + up */}
        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid var(--border)' }}>
          <button onClick={goUp} disabled={!dir} title="Parent directory" style={smallBtnStyle}>↑</button>
          <span style={{ color: 'var(--text-dim)', fontFamily: 'monospace', fontSize: '12px' }}>/</span>
          <input value={pathInput}
            onInput={e => setPathInput((e.target as HTMLInputElement).value)}
            onKeyDown={e => { if (e.key === 'Enter') load(pathInput.replace(/^\/+/, '')); }}
            placeholder="type a path, Enter to go — e.g. work/scripts"
            title="Type or paste a directory path, then press Enter"
            style={{ flex: 1, background: 'var(--bg-input)', color: 'var(--text-bright)', border: '1px solid var(--border-strong)', padding: '3px 8px', borderRadius: '3px', fontSize: '12px', outline: 'none', fontFamily: 'monospace' }}
          />
        </div>

        {/* Search filter */}
        <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
          <input value={filter}
            onInput={e => setFilter((e.target as HTMLInputElement).value)}
            placeholder={`Search this folder (${dirs.length} folders, ${files.length} files)…`}
            style={{ width: '100%', background: 'var(--bg-input)', color: 'var(--text-bright)', border: '1px solid var(--border-strong)', padding: '4px 8px', borderRadius: '3px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Listing: folders (navigate) + files (click to reuse the name) */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: '180px', maxHeight: '300px', fontFamily: 'monospace', fontSize: '12px' }}>
          {error && <div style={{ padding: '8px 12px', color: 'var(--status-error)' }}>{error}</div>}
          {dirs.map(e => (
            <div key={'d/' + e.name} onClick={() => navigate(e)}
              title="Open folder"
              style={rowStyle('var(--syntax-yellow)')}
              onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
              onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = 'transparent'}>
              📁 {e.name}
            </div>
          ))}
          {files.map(e => (
            <div key={'f/' + e.name} onClick={() => setFilename(e.name)}
              title="Use this filename (overwrite)"
              style={rowStyle(isQ(e.name) ? 'var(--syntax-teal)' : 'var(--text-secondary)')}
              onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
              onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = 'transparent'}>
              📄 {e.name}
            </div>
          ))}
          {dirs.length === 0 && files.length === 0 && !error && (
            <div style={{ padding: '10px 12px', color: 'var(--text-dim)' }}>{q ? 'No matches.' : 'Empty folder.'}</div>
          )}
        </div>

        {/* Filename */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px', whiteSpace: 'nowrap' }}>Save as:</span>
          <input value={filename}
            onInput={e => setFilename((e.target as HTMLInputElement).value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            style={{ flex: 1, background: 'var(--bg-input)', color: 'var(--text-bright)', border: '1px solid var(--border-strong)', padding: '4px 8px', borderRadius: '3px', fontSize: '12px', outline: 'none', fontFamily: 'monospace' }}
            autoFocus
            onFocus={e => (e.target as HTMLInputElement).select()}
          />
        </div>

        {/* Buttons */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            → /{dir ? dir + '/' : ''}{filename.trim()}
          </span>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={onCancel} style={{ ...btnStyle, background: 'var(--bg-input)', color: 'var(--text-bright)' }}>Cancel</button>
            <button onClick={handleSave} style={{ ...btnStyle, background: 'var(--accent-btn)', color: 'var(--text-white)' }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const rowStyle = (color: string) => ({
  padding: '4px 12px', cursor: 'pointer', color, whiteSpace: 'nowrap' as const,
  overflow: 'hidden', textOverflow: 'ellipsis',
});

const smallBtnStyle = {
  background: 'var(--bg-input)', color: 'var(--text-bright)', border: '1px solid var(--border-strong)',
  borderRadius: '3px', cursor: 'pointer', fontSize: '14px', padding: '2px 8px',
};

const btnStyle = {
  padding: '5px 16px', border: '1px solid var(--border-strong)', borderRadius: '3px',
  cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
};
