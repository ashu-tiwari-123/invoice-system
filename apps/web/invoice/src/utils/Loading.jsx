import { useEffect, useState } from "react";
import { HiOfficeBuilding, HiDocumentText, HiChartBar } from "react-icons/hi";

const Loading = () => {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % 3);
        }, 600);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <div className="text-center">
                {/* Circular progress with gradient */}
                <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="w-full h-full border-4 border-primary/10 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-r-secondary rounded-full animate-spin" style={{ animationDelay: '0.1s' }}></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-b-accent rounded-full animate-spin" style={{ animationDelay: '0.2s' }}></div>
                </div>

                {/* Pulsing text */}
                <p className="text-text/70 animate-pulse">Loading your content...</p>
            </div>
        </div>
    );
};

export default Loading;