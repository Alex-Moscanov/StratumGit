import React, { useState } from 'react';
import { generateSampleLessonCompletionData } from '@/services/lessonCompletionService';
import { FiRefreshCw } from 'react-icons/fi';

const GenerateEngagementData = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateData = async () => {
    try {
      setLoading(true);
      setSuccess(false);
      setError('');
      
      await generateSampleLessonCompletionData();
      
      setSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Error generating sample data:', err);
      setError('Failed to generate sample data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <button
        onClick={handleGenerateData}
        disabled={loading}
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? (
          <>
            <FiRefreshCw className="animate-spin mr-2" />
            Generating...
          </>
        ) : (
          <>
            <FiRefreshCw className="mr-2" />
            Generate Sample Data
          </>
        )}
      </button>
      
      {success && (
        <p className="text-green-600 mt-2">
          Sample data generated successfully! Reloading...
        </p>
      )}
      
      {error && (
        <p className="text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
};

export default GenerateEngagementData;
