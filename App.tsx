
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ReactReader, IReactReaderProps } from 'react-reader';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure pdfjs worker to avoid issues with create-react-app.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// --- TYPES ---
interface Book {
  id: string;
  name: string;
  type: 'pdf' | 'epub';
  url: string;
  added: number;
}

interface Settings {
  theme: 'light' | 'dark';
  brightness: number; // 0.5 to 1.5
}

type ReadingMode = 'book' | 'scroll';
type Bookmarks = Record<string, string | number>; // bookId -> epubCfi or pdf page number

// --- ICONS (as SVG components) ---
const IconBook = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
);
const IconFilePlus = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
);
const IconSun = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
);
const IconMoon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);
const IconX = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const IconSettings = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1 0 2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);
const IconArrowLeft = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);
const IconBookmark = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
);
const IconTrash = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);
const IconFileText = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
);
const IconBookOpen = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);
const IconScroll = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="8 18 12 22 16 18"/><polyline points="8 6 12 2 16 6"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
);


// --- LOCAL STORAGE HOOK ---
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// --- AD COMPONENTS ---
const BannerAd = () => (
  <div className="w-full mt-4 bg-slate-200 dark:bg-slate-700 p-4 text-center text-slate-500 dark:text-slate-400 rounded-lg">
    <p className="font-bold text-sm">Advertisement</p>
    <p className="text-xs">Your ad banner here</p>
  </div>
);

const InterstitialAd = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100]">
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl w-11/12 max-w-md text-center relative">
      <button onClick={onClose} className="absolute top-2 right-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" aria-label="Close Ad">
        <IconX className="w-6 h-6" />
      </button>
      <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Advertisement</h2>
      <div className="bg-slate-200 dark:bg-slate-700 h-64 flex items-center justify-center rounded">
        <p className="text-slate-500 dark:text-slate-400">Interstitial Ad Content</p>
      </div>
      <button onClick={onClose} className="mt-4 w-full bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
        Skip Ad & Continue
      </button>
    </div>
  </div>
);

// --- MAIN APP ---
const App: React.FC = () => {
  const [books, setBooks] = useLocalStorage<Book[]>('ebooks', []);
  const [settings, setSettings] = useLocalStorage<Settings>('ebook-settings', { theme: 'light', brightness: 1 });
  const [bookmarks, setBookmarks] = useLocalStorage<Bookmarks>('ebook-bookmarks', {});

  const [currentView, setCurrentView] = useState<'library' | 'reader' | 'settings'>('library');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [readingMode, setReadingMode] = useState<ReadingMode | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');


  // Apply theme and brightness
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    document.body.style.filter = `brightness(${settings.brightness})`;
  }, [settings]);

  // Toast notification handler
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    const newBooks: Book[] = [];
    Array.from(files).forEach(file => {
      const fileType = file.name.endsWith('.pdf') ? 'pdf' : (file.name.endsWith('.epub') ? 'epub' : null);
      if (fileType) {
        const book: Book = {
          id: `${file.name}-${file.lastModified}`,
          name: file.name.replace(/\.(pdf|epub)$/i, ''),
          type: fileType,
          url: URL.createObjectURL(file),
          added: Date.now(),
        };
        newBooks.push(book);
      }
    });

    setBooks(prevBooks => [...prevBooks, ...newBooks]);
    setIsLoading(false);
    showToast(`${newBooks.length} book(s) added!`);
  };

  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
    setShowModeModal(true);
  };
  
  const handleSetReadingMode = (mode: ReadingMode) => {
    setReadingMode(mode);
    setShowModeModal(false);
    setShowInterstitial(true);
  };

  const handleCloseInterstitial = () => {
    setShowInterstitial(false);
    setCurrentView('reader');
  };
  
  const handleDeleteBook = (bookId: string) => {
    setBooks(books => books.filter(b => b.id !== bookId));
    setBookmarks(bookmarks => {
        const newBookmarks = {...bookmarks};
        delete newBookmarks[bookId];
        return newBookmarks;
    });
    showToast("Book removed.");
  };

  const handleUpdateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
  };

  const handleSetBookmark = (bookId: string, location: string | number) => {
    setBookmarks(b => ({ ...b, [bookId]: location }));
    showToast("Bookmark saved!");
  };

  const selectedBook = useMemo(() => books.find(b => b.id === selectedBookId), [books, selectedBookId]);

  const filteredAndSortedBooks = useMemo(() => {
    return books
      .filter(book => book.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return b.added - a.added; // Default to newest first
      });
  }, [books, searchTerm, sortBy]);
  
  const renderView = () => {
    switch (currentView) {
      case 'reader':
        return selectedBook && readingMode ? (
          <ReaderView
            book={selectedBook}
            mode={readingMode}
            onBack={() => {
                setCurrentView('library');
                setSelectedBookId(null);
                setReadingMode(null);
            }}
            settings={settings}
            onUpdateSetting={handleUpdateSetting}
            onSetBookmark={handleSetBookmark}
            initialLocation={bookmarks[selectedBook.id]}
          />
        ) : null;
      case 'settings':
        return <SettingsView onBack={() => setCurrentView('library')} settings={settings} onUpdateSetting={handleUpdateSetting} />;
      case 'library':
      default:
        return (
          <LibraryView
            books={filteredAndSortedBooks}
            onSelectBook={handleSelectBook}
            onFileUpload={handleFileUpload}
            isLoading={isLoading}
            onDeleteBook={handleDeleteBook}
            onShowSettings={() => setCurrentView('settings')}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        );
    }
  };

  return (
    <div className={`min-h-screen font-sans bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-300`}>
      {renderView()}
      
      {showModeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-xl w-11/12 max-w-sm text-center">
             <h2 className="text-2xl font-bold mb-6">Choose Reading Mode</h2>
             <div className="flex flex-col space-y-4">
                 <button onClick={() => handleSetReadingMode('book')} className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2">
                    <IconBookOpen className="w-5 h-5"/>
                    <span>Book Mode</span>
                 </button>
                 <button onClick={() => handleSetReadingMode('scroll')} className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2">
                    <IconScroll className="w-5 h-5"/>
                    <span>Scroll Mode</span>
                 </button>
             </div>
             <button onClick={() => setShowModeModal(false)} className="mt-6 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                Cancel
             </button>
          </div>
        </div>
      )}

      {showInterstitial && <InterstitialAd onClose={handleCloseInterstitial} />}

      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-slate-800 text-white py-2 px-4 rounded-full shadow-lg z-[110]">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

// --- LIBRARY VIEW ---
interface LibraryViewProps {
  books: Book[];
  isLoading: boolean;
  searchTerm: string;
  sortBy: 'name' | 'date';
  onSelectBook: (bookId: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteBook: (bookId: string) => void;
  onShowSettings: () => void;
  setSearchTerm: (term: string) => void;
  setSortBy: (sort: 'name' | 'date') => void;
}
const LibraryView: React.FC<LibraryViewProps> = ({ books, isLoading, onSelectBook, onFileUpload, onDeleteBook, onShowSettings, searchTerm, setSearchTerm, sortBy, setSortBy }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-400 flex items-center gap-2">
            <IconBook className="w-8 h-8"/> My eBook Reader
        </h1>
        <button onClick={onShowSettings} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="Settings">
          <IconSettings className="w-6 h-6" />
        </button>
      </header>
      
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search books..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full flex-grow bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'date')}
          className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
        >
          <option value="date">Sort by Date</option>
          <option value="name">Sort by Name (A-Z)</option>
        </select>
      </div>

      {books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {books.map(book => (
            <div key={book.id} className="relative group">
              <button onClick={() => onSelectBook(book.id)} className="w-full text-left bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-xl dark:hover:shadow-primary-900/50 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                <div className="aspect-[3/4] bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  {book.type === 'pdf' ? <IconFileText className="w-16 h-16 text-red-500"/> : <IconBookOpen className="w-16 h-16 text-blue-500"/>}
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm truncate">{book.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">{book.type}</p>
                </div>
              </button>
              <button onClick={() => onDeleteBook(book.id)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600" aria-label={`Delete ${book.name}`}>
                  <IconTrash className="w-4 h-4"/>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
          <IconBook className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-xl font-medium">No books yet</h3>
          <p className="mt-1 text-slate-500">Click below to add your first PDF or EPUB.</p>
        </div>
      )}
      
      <div className="fixed bottom-6 right-6">
        <input type="file" ref={fileInputRef} onChange={onFileUpload} accept=".pdf,.epub" multiple className="hidden"/>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-900 flex items-center gap-2"
          aria-label="Add new book"
        >
          <IconFilePlus className="w-6 h-6" />
          {isLoading && <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>}
        </button>
      </div>
      
      <BannerAd />
    </div>
  );
};

// --- READER VIEW ---
interface ReaderViewProps {
  book: Book;
  mode: ReadingMode;
  onBack: () => void;
  settings: Settings;
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onSetBookmark: (bookId: string, location: string | number) => void;
  initialLocation?: string | number;
}
const ReaderView: React.FC<ReaderViewProps> = ({ book, mode, onBack, settings, onUpdateSetting, onSetBookmark, initialLocation }) => {
  const [location, setLocation] = useState<string | number | undefined>(initialLocation);
  const [fontSize, setFontSize] = useState(100); // For EPUB
  const [zoom, setZoom] = useState(1); // For PDF

  const handleLocationChanged = (loc: string | number) => {
    setLocation(loc);
  };
  
  const readerContent = useMemo(() => {
    if (book.type === 'epub') {
      return (
        <EpubReaderComponent
          url={book.url}
          mode={mode}
          location={location as string | undefined}
          onLocationChanged={handleLocationChanged}
          fontSize={fontSize}
        />
      );
    }
    if (book.type === 'pdf') {
      return (
        <PdfReaderComponent
          url={book.url}
          mode={mode}
          initialPage={location as number | undefined}
          onPageChanged={handleLocationChanged}
          zoom={zoom}
        />
      );
    }
    return null;
  }, [book, mode, location, fontSize, zoom]);

  return (
    <div className="h-screen w-screen flex flex-col bg-white dark:bg-black">
      <header className="flex justify-between items-center p-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-20">
        <button onClick={onBack} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Back to library">
          <IconArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="font-bold truncate text-center mx-4">{book.name}</h2>
        <div className="flex items-center gap-2">
            <button onClick={() => location && onSetBookmark(book.id, location)} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Save Bookmark">
                <IconBookmark className="w-6 h-6"/>
            </button>
            <div className="flex items-center gap-1">
                <IconSun className="w-5 h-5"/>
                <input type="range" min="0.5" max="1.5" step="0.1" value={settings.brightness}
                    onChange={(e) => onUpdateSetting('brightness', parseFloat(e.target.value))}
                    className="w-20"
                />
            </div>
            { book.type === 'epub' && 
                <div className="flex items-center gap-1">
                    <span className="text-sm">A</span>
                    <input type="range" min="80" max="200" step="10" value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="w-20"
                    />
                    <span className="text-lg">A</span>
                </div>
            }
            { book.type === 'pdf' && 
                <div className="flex items-center gap-1">
                    <button onClick={() => setZoom(z => Math.max(0.5, z-0.1))} className="px-2">-</button>
                    <span>{Math.round(zoom*100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(3, z+0.1))} className="px-2">+</button>
                </div>
            }
        </div>
      </header>
      <main className="flex-1 overflow-hidden relative">
        {readerContent}
      </main>
    </div>
  );
};


// --- EPUB READER COMPONENT ---
interface EpubReaderProps {
  url: string;
  mode: ReadingMode;
  location?: string;
  onLocationChanged: (epubCfi: string) => void;
  fontSize: number;
}
const EpubReaderComponent: React.FC<EpubReaderProps> = ({ url, mode, location, onLocationChanged, fontSize }) => {
  const readerRef = useRef<any>(null);
  
  useEffect(() => {
    if (readerRef.current && readerRef.current.rendition) {
      readerRef.current.rendition.themes.fontSize(`${fontSize}%`);
    }
  }, [fontSize]);
  
  return (
    <div className="h-full w-full bg-white dark:bg-[#121212]">
      <ReactReader
        key={`${url}-${mode}`} // Re-mounts reader when mode changes
        url={url}
        location={location}
        locationChanged={onLocationChanged}
        epubOptions={{
          flow: mode === 'scroll' ? 'scrolled-doc' : 'paginated',
          manager: 'continuous',
        }}
        ref={readerRef}
      />
    </div>
  );
};

// --- PDF READER COMPONENT ---
interface PdfReaderProps {
    url: string;
    mode: ReadingMode;
    initialPage?: number;
    onPageChanged: (page: number) => void;
    zoom: number;
}
const PdfReaderComponent: React.FC<PdfReaderProps> = ({ url, mode, initialPage, onPageChanged, zoom }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(initialPage || 1);
    const containerRef = useRef<HTMLDivElement>(null);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    useEffect(() => {
        onPageChanged(currentPage);
    }, [currentPage, onPageChanged]);

    const goToPrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
    const goToNextPage = () => setCurrentPage(p => Math.min(numPages || p, p + 1));

    if (mode === 'scroll') {
        return (
            <div className="h-full w-full overflow-y-auto bg-slate-50 dark:bg-slate-800" ref={containerRef}>
                <Document file={url} onLoadSuccess={onDocumentLoadSuccess} loading={<p>Loading PDF...</p>}>
                    {Array.from(new Array(numPages || 0), (el, index) => (
                        <div key={`page_${index + 1}`} className="my-4 shadow-lg flex justify-center">
                           <Page pageNumber={index + 1} scale={zoom} renderAnnotationLayer={false} renderTextLayer={false} />
                        </div>
                    ))}
                </Document>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 p-4">
            <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ transform: `scale(${zoom})` }}>
                <Document file={url} onLoadSuccess={onDocumentLoadSuccess} loading={<p>Loading PDF...</p>}>
                    <Page pageNumber={currentPage} renderAnnotationLayer={false} renderTextLayer={false} />
                </Document>
            </div>
            {numPages && (
                <div className="flex items-center gap-4 mt-4 p-2 bg-slate-200 dark:bg-slate-700 rounded-full">
                    <button onClick={goToPrevPage} disabled={currentPage <= 1}>Prev</button>
                    <span>Page {currentPage} of {numPages}</span>
                    <button onClick={goToNextPage} disabled={!numPages || currentPage >= numPages}>Next</button>
                </div>
            )}
        </div>
    );
};

// --- SETTINGS VIEW ---
interface SettingsViewProps {
  onBack: () => void;
  settings: Settings;
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}
const SettingsView: React.FC<SettingsViewProps> = ({ onBack, settings, onUpdateSetting }) => {
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex items-center mb-8">
        <button onClick={onBack} className="p-2 mr-4 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Back to library">
            <IconArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>
      <div className="space-y-6">
        <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
            <label className="font-medium">Dark Mode</label>
            <button onClick={() => onUpdateSetting('theme', settings.theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700">
                {settings.theme === 'light' ? <IconMoon/> : <IconSun/>}
            </button>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
            <label htmlFor="brightness" className="block font-medium mb-2">Default Brightness</label>
            <div className="flex items-center gap-4">
                <IconSun className="w-6 h-6"/>
                <input
                    id="brightness"
                    type="range"
                    min="0.5" max="1.5" step="0.1"
                    value={settings.brightness}
                    onChange={(e) => onUpdateSetting('brightness', parseFloat(e.target.value))}
                    className="w-full"
                />
            </div>
        </div>
      </div>
    </div>
  );
};


export default App;
