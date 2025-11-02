import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PixelData } from './types';
import PixelGrid from './components/PixelGrid';

const TOTAL_PIXELS = 1_000_000;
const GRID_WIDTH = 1000;

// --- Helper Components defined in the same file ---

interface HeaderProps {
    purchasedCount: number;
    onMenuToggle: () => void;
    onSearchSubmit: (e: React.FormEvent) => void;
    searchInput: string;
    onSearchInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
const Header: React.FC<HeaderProps> = ({ purchasedCount, onMenuToggle, onSearchSubmit, searchInput, onSearchInputChange }) => (
    <header className="fixed top-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm z-30 flex items-center justify-between p-4 border-b border-gray-700 gap-4">
        <div className="flex flex-col flex-shrink-0">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tighter">The Million Pixel Grid</h1>
            <p className="text-sm text-gray-400">Immortalize Your Link</p>
        </div>
        
        <div className="flex-grow flex justify-center px-4">
            <form onSubmit={onSearchSubmit} className="flex gap-2 w-full max-w-md">
                <input 
                    type="number" 
                    min="0" 
                    max={TOTAL_PIXELS-1} 
                    value={searchInput} 
                    onChange={onSearchInputChange} 
                    placeholder={`Search Pixel # (0-${TOTAL_PIXELS-1})`} 
                    className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
                <button type="submit" className="px-4 py-2 bg-blue-600 rounded-md font-semibold hover:bg-blue-500 transition-colors flex-shrink-0">
                    <i className="ph-magnifying-glass text-xl"></i>
                </button>
            </form>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-center bg-gray-800 px-4 py-2 rounded-lg">
                <div className="text-lg font-bold text-white">{new Intl.NumberFormat().format(purchasedCount)} / {new Intl.NumberFormat().format(TOTAL_PIXELS)}</div>
                <div className="text-xs text-gray-400">Pixels Claimed</div>
            </div>
            <button onClick={onMenuToggle} className="p-2 rounded-md hover:bg-gray-700 transition-colors">
                <i className="ph-list text-3xl"></i>
            </button>
        </div>
    </header>
);

interface NotificationBannerProps {
    message: string | null;
}
const NotificationBanner: React.FC<NotificationBannerProps> = ({ message }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (message) {
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 4000);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [message]);

    return (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}`}>
            {message && (
                <div className="bg-blue-500 text-white px-6 py-3 rounded-full shadow-lg text-sm">
                    <i className="ph-sparkle mr-2"></i> {message}
                </div>
            )}
        </div>
    );
};

interface PurchaseModalProps {
    pixelId: number | null;
    onClose: () => void;
    onPurchase: (pixelId: number, color: string, link: string) => void;
}
const PurchaseModal: React.FC<PurchaseModalProps> = ({ pixelId, onClose, onPurchase }) => {
    const [color, setColor] = useState('#FFFFFF');
    const [link, setLink] = useState('https://');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pixelId !== null && link && URL.canParse(link)) {
            onPurchase(pixelId, color, link);
        } else {
            alert("Please enter a valid URL.");
        }
    };

    if (pixelId === null) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-2">Purchase Pixel #{pixelId}</h2>
                <p className="text-gray-400 mb-6">Choose a color and set your link to claim this pixel forever.</p>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2">Color</label>
                        <div className="flex items-center gap-4">
                            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-16 h-16 p-1 bg-gray-700 border border-gray-600 rounded-md cursor-pointer" />
                            <input type="text" value={color} onChange={e => setColor(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-300 mb-2">Link (URL)</label>
                        <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://example.com" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold transition-colors">Purchase</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
}
const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose }) => {
    return (
        <>
            <div className={`fixed inset-0 bg-black/60 z-30 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
            <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-gray-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 flex justify-between items-center border-b border-gray-700">
                    <h2 className="text-2xl font-bold">Menu</h2>
                    <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-700"><i className="ph-x text-2xl"></i></button>
                </div>
                <div className="p-6 space-y-8">
                    {/* Tutorial Section */}
                    <section>
                        <h3 className="text-xl font-semibold mb-4 text-gray-300">How It Works</h3>
                        <ol className="list-decimal list-inside space-y-2 text-gray-400">
                            <li>Scroll and pan around the 1000x1000 pixel grid.</li>
                            <li>Click on any uncolored (available) pixel to select it.</li>
                            <li>A purchase window will appear. Choose your color and enter a URL.</li>
                            <li>"Purchase" to claim your pixel on the grid forever.</li>
                            <li>Use the search bar in the header to find a specific pixel by its ID.</li>
                        </ol>
                    </section>
                </div>
            </div>
        </>
    );
};

interface TooltipInfo {
    pixel: PixelData;
    x: number;
    y: number;
}
interface PixelTooltipProps {
    tooltip: TooltipInfo | null;
}
const PixelTooltip: React.FC<PixelTooltipProps> = ({ tooltip }) => {
    if (!tooltip) return null;

    const style: React.CSSProperties = {
        position: 'fixed',
        top: tooltip.y + 20,
        left: tooltip.x,
        pointerEvents: 'none',
        transform: 'translateX(-50%)',
    };

    return (
        <div style={style} className="z-50 p-3 bg-gray-900/80 backdrop-blur-sm rounded-md shadow-lg border border-gray-600 max-w-xs text-sm animate-fade-in">
            <p className="font-bold text-white">Pixel #{tooltip.pixel.id}</p>
            <div className="flex items-center gap-2 mt-1">
                <div className="w-4 h-4 rounded border border-gray-500 flex-shrink-0" style={{ backgroundColor: tooltip.pixel.color }}></div>
                <p className="text-gray-300 truncate min-w-0">
                    <a href={tooltip.pixel.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline pointer-events-auto">{tooltip.pixel.link}</a>
                </p>
            </div>
        </div>
    );
};

interface SearchResultDisplayProps {
    searchData: { id: number; data: PixelData | null } | null;
    onClose: () => void;
    onViewOnGrid: (pixelId: number) => void;
    onPurchaseClick: (pixelId: number) => void;
}
const SearchResultDisplay: React.FC<SearchResultDisplayProps> = ({ searchData, onClose, onViewOnGrid, onPurchaseClick }) => {
    if (!searchData) return null;

    return (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm">
             <div className="p-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-700 animate-fade-in">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-lg text-white">Pixel #{searchData.id}</h4>
                        {searchData.data ? (
                            <>
                                <p className="text-green-400 text-sm">Status: Purchased</p>
                                <p className="text-gray-300 truncate text-sm">
                                    Link: <a href={searchData.data.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{searchData.data.link}</a>
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-sm text-gray-400">Color:</span>
                                    <div className="w-5 h-5 rounded border border-gray-500" style={{ backgroundColor: searchData.data.color }}></div>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-yellow-400 text-sm">Status: Available</p>
                                <p className="text-gray-400 text-sm mt-2">This pixel is unclaimed. Be the first to own it!</p>
                                <button
                                    onClick={() => onPurchaseClick(searchData.id)}
                                    className="mt-4 w-full text-center px-4 py-2 bg-green-600 rounded-md font-semibold hover:bg-green-500 transition-colors"
                                >
                                    Purchase this Pixel
                                </button>
                            </>
                        )}
                        <button onClick={() => onViewOnGrid(searchData.id)} className="mt-3 text-sm text-blue-400 hover:underline font-semibold">
                            View on Grid <i className="ph-arrow-right align-middle"></i>
                        </button>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white">
                        <i className="ph-x text-lg"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---

export default function App() {
    const [pixels, setPixels] = useState<Map<number, PixelData>>(new Map());
    const [notification, setNotification] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedPixelForPurchase, setSelectedPixelForPurchase] = useState<number | null>(null);
    const [searchedPixel, setSearchedPixel] = useState<number | null>(null);
    const [searchedPixelData, setSearchedPixelData] = useState<{ id: number; data: PixelData | null } | null>(null);
    const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
    const [searchInput, setSearchInput] = useState('');
    const gridContainerRef = useRef<HTMLDivElement>(null);

    // Simulate initial data and live purchases
    useEffect(() => {
        // Initial data
        const initialPixels = new Map<number, PixelData>();
        for (let i = 0; i < 500; i++) {
            const randomId = Math.floor(Math.random() * TOTAL_PIXELS);
            if (!initialPixels.has(randomId)) {
                initialPixels.set(randomId, {
                    id: randomId,
                    color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
                    link: 'https://example.com'
                });
            }
        }
        setPixels(initialPixels);

        // Simulated live purchases
        const interval = setInterval(() => {
            setPixels(prevPixels => {
                let randomId;
                do {
                    randomId = Math.floor(Math.random() * TOTAL_PIXELS);
                } while (prevPixels.has(randomId));

                const newPixel = {
                    id: randomId,
                    color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
                    link: 'https://example.com',
                };
                
                const newPixels = new Map(prevPixels);
                newPixels.set(randomId, newPixel);

                setNotification(`Pixel #${randomId} was just purchased!`);
                return newPixels;
            });
        }, 8000);

        return () => clearInterval(interval);
    }, []);
    
    const handlePixelSelect = useCallback((pixelId: number) => {
        const existingPixel = pixels.get(pixelId);
        if (existingPixel) {
            window.open(existingPixel.link, '_blank', 'noopener,noreferrer');
        } else {
            setSelectedPixelForPurchase(pixelId);
        }
    }, [pixels]);

    const handlePixelHover = useCallback((pixelId: number | null, mouseX: number, mouseY: number) => {
        if (pixelId === null) {
            setTooltip(null);
            return;
        }
        const pixelData = pixels.get(pixelId);
        if (pixelData) {
            setTooltip({ pixel: pixelData, x: mouseX, y: mouseY });
        } else {
            setTooltip(null);
        }
    }, [pixels]);

    const handlePurchase = (pixelId: number, color: string, link: string) => {
        const newPixel: PixelData = { id: pixelId, color, link };
        setPixels(prev => new Map(prev).set(pixelId, newPixel));
        setNotification(`You purchased Pixel #${pixelId}!`);
        setSelectedPixelForPurchase(null);
    };
    
    const scrollToPixel = (pixelId: number) => {
        const container = gridContainerRef.current;
        if (!container) return;
        const x = pixelId % GRID_WIDTH;
        const y = Math.floor(pixelId / GRID_WIDTH);
        
        container.scrollTo({
            left: x - container.clientWidth / 2,
            top: y - container.clientHeight / 2,
            behavior: 'smooth'
        });
    };

    const handleSearch = (pixelId: number) => {
        setSearchedPixel(pixelId);
        const data = pixels.get(pixelId) || null;
        setSearchedPixelData({ id: pixelId, data });
        scrollToPixel(pixelId);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const id = parseInt(searchInput, 10);
        if (!isNaN(id) && id >= 0 && id < TOTAL_PIXELS) {
            handleSearch(id);
        } else {
            alert(`Please enter a number between 0 and ${TOTAL_PIXELS - 1}.`);
        }
    };

    const handleCloseSearchResult = useCallback(() => {
        setSearchedPixelData(null);
        setSearchedPixel(null);
    }, []);

    const handlePurchaseClick = useCallback((pixelId: number) => {
        handleCloseSearchResult();
        setSelectedPixelForPurchase(pixelId);
    }, [handleCloseSearchResult]);

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden">
            <Header 
                purchasedCount={pixels.size} 
                onMenuToggle={() => setIsMenuOpen(true)}
                onSearchSubmit={handleSearchSubmit}
                searchInput={searchInput}
                onSearchInputChange={e => setSearchInput(e.target.value)}
            />
            <NotificationBanner message={notification} />
            <PixelTooltip tooltip={tooltip} />
            <SearchResultDisplay 
                searchData={searchedPixelData}
                onClose={handleCloseSearchResult}
                onViewOnGrid={scrollToPixel}
                onPurchaseClick={handlePurchaseClick}
            />

            <main ref={gridContainerRef} className="flex-grow pt-[88px] overflow-auto">
                <div className="relative w-[1000px] h-[1000px] mx-auto my-8 bg-gray-800 border-2 border-gray-700 shadow-2xl">
                    <PixelGrid 
                        pixels={pixels}
                        onPixelSelect={handlePixelSelect}
                        searchedPixel={searchedPixel}
                        onPixelHover={handlePixelHover}
                    />
                </div>
            </main>

            <SideMenu 
                isOpen={isMenuOpen} 
                onClose={() => setIsMenuOpen(false)} 
            />
            <PurchaseModal 
                pixelId={selectedPixelForPurchase}
                onClose={() => setSelectedPixelForPurchase(null)}
                onPurchase={handlePurchase}
            />
        </div>
    );
}