import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
const DOMPurifyNode = DOMPurify(window);


export const sanitizeData = (value: any) => {
    if (typeof value === 'string') {
      return DOMPurifyNode.sanitize(value);
    }

    if (typeof value === 'object' && value !== null) {
      const sanitizedObject: any = Array.isArray(value) ? [] : {};
      
      for (const [key, val] of Object.entries(value)) {
        sanitizedObject[key] = sanitizeData(val);
      }
      
      return sanitizedObject;
    }

    return value; // If the value is neither string nor object, return it as is
  }