import { useState } from 'react';

const TestHomePage = () => {
    const [activeStory, setActiveStory] = useState(null);

    return (
        <div className="min-h-screen bg-white p-8">
            <h1 className="text-2xl font-bold mb-4">Home Page Test</h1>
            <button
                onClick={() => setActiveStory({ stories: [], user: { username: 'test' } })}
                className="px-4 py-2 bg-blue-500 text-white rounded mr-4"
            >
                Test Story Click
            </button>
            <button
                onClick={() => window.location.href = '/messages'}
                className="px-4 py-2 bg-green-500 text-white rounded"
            >
                Test Messages Navigate
            </button>
            {activeStory && (
                <div className="mt-4 p-4 bg-gray-100 rounded">
                    <p>Story viewer would appear here</p>
                    <button onClick={() => setActiveStory(null)} className="mt-2 px-4 py-2 bg-red-500 text-white rounded">Close</button>
                </div>
            )}
        </div>
    );
};

export default TestHomePage;
