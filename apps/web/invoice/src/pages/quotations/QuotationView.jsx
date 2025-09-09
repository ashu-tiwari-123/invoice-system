// src/modules/quotations/QuotationView.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../axiosInstance";
import QuotationPreview from "./QuotationPreview"; // adjust path if needed
import Loading from "../../utils/Loading";
import { downloadQuotationPdf } from "../../utils/DownloadPdf";

export default function QuotationView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const previewRef = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await api.get(`/quotations/${id}`);
                setQuotation(res?.data?.data || null);
            } catch (e) {
                console.error("Failed to fetch quotation", e);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    // const openLivePreview = async () => {
    //     try {
    //         // correct backend route
    //         const res = await api.get(`/create-quote/${id}/pdf-preview`, {
    //             responseType: "text", // get raw HTML string
    //         });

    //         // create blob & open (keeps auth because axios used)
    //         const blob = new Blob([res.data], { type: "text/html" });
    //         const url = URL.createObjectURL(blob);
    //         window.open(url, "_blank", "noopener,noreferrer");

    //         // revoke after a bit (optional)
    //         setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    //     } catch (err) {
    //         console.error("Preview failed", err);
    //         toast.error("Live preview failed");
    //     }
    // };

    if (loading) {
        return <Loading />;
    }

    if (!quotation) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Quotation not found</h3>
                    <p className="mt-1 text-sm text-gray-500">The requested quotation could not be loaded.</p>
                    <div className="mt-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="">
            <div className="mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-1.5 mr-2 text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100"
                            title="Go back"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                        </button>


                    </div>

                    <button
                        onClick={() => downloadQuotationPdf(quotation._id, quotation.quotationNo)}
                        disabled={isDownloading}
                        className="hidden md:flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Downloading...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Download PDF
                            </>
                        )}
                    </button>
                    {/* <button onClick={openLivePreview} className="px-4 py-2 border rounded">
                        Live Preview (HTML)
                    </button> */}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
                <div className="hidden md:block md:h-[calc(100vh-200px)] md:overflow-auto p-2 md:p-3">
                    <QuotationPreview ref={previewRef} quotation={quotation} />
                </div>
                <div className="md:hidden p-2">
                    <QuotationPreview ref={previewRef} quotation={quotation} />
                </div>
            </div>

            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-3 shadow-lg z-10">
                <button
                    onClick={() => downloadServerPdf(quotation._id, quotation.quotationNo)}
                    disabled={isDownloading}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                    {isDownloading ? (
                        <>
                            <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Downloading...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Download PDF
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
