import { FaSearch, FaShoppingBag } from 'react-icons/fa';

const ShopPage = () => {
    return (
        <div className="min-h-screen bg-[#fafafa] pt-8 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Shop Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <FaShoppingBag className="text-gray-900" /> Shop
                    </h1>
                    <div className="relative max-w-md w-full">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search shops"
                            className="w-full bg-gray-100 border-none rounded-lg py-2 pl-12 pr-6 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all text-sm font-light"
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {['Shops', 'Videos', 'Editors\' picks', 'Collections', 'Guides'].map(cat => (
                        <button key={cat} className="px-4 py-1.5 bg-gray-100 rounded-lg text-sm font-bold whitespace-nowrap hover:bg-gray-200 transition-colors">
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Shop Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-7">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="aspect-square bg-white border border-gray-100 relative group cursor-pointer overflow-hidden rounded-sm">
                            <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center text-gray-200 gap-3">
                                <FaShoppingBag size={32} />
                                <span className="font-bold text-xs">PRODUCT {i}</span>
                            </div>
                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-3 left-3 bg-white/90 px-2 py-1 rounded text-[10px] font-bold text-gray-900 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                View Shop
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};

export default ShopPage;
