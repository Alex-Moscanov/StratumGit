/**
 * Generates a random access code for course enrollment
 * @param {number} length - Length of the access code (default: 6)
 * @returns {string} - The generated access code
 */
export const generateAccessCode = (length = 6) => {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    
    // Generate random characters
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
    
    return result;
  };
  
  /**
   * Validates an access code format
    @param {string} code 
   * @returns {boolean} 
   */

  // Check if code is 6-8 characters and contains only uppercase letters and numbers
  export const validateAccessCodeFormat = (code) => {
    const regex = /^[A-Z0-9]{6,8}$/;
    return regex.test(code);
  };
  