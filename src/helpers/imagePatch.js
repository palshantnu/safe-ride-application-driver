import * as RN from 'react-native';
import React from 'react';

// Helper to recursively or directly format URIs in the source prop
const formatImageSource = (source) => {
  if (!source) return source;
  
  if (typeof source === 'object') {
    if (Array.isArray(source)) {
      return source.map(formatImageSource);
    }
    
    if (source.uri && typeof source.uri === 'string') {
      let finalUri = source.uri;
      // If it contains http://, replace it with https://
      if (finalUri.startsWith('http://')) {
        finalUri = finalUri.replace(/^http:\/\//i, 'https://');
      }
      return {
        ...source,
        uri: finalUri,
      };
    }
  }
  return source;
};

// 1. Patch react-native Image component
const OriginalImage = RN.Image;
if (OriginalImage) {
  const PatchedImage = React.forwardRef((props, ref) => {
    const newProps = { ...props };
    if (props.source) {
      newProps.source = formatImageSource(props.source);
    }
    if (props.defaultSource) {
      newProps.defaultSource = formatImageSource(props.defaultSource);
    }
    return <OriginalImage {...newProps} ref={ref} />;
  });

  // Copy all static properties
  Object.keys(OriginalImage).forEach((key) => {
    PatchedImage[key] = OriginalImage[key];
  });

  try {
    Object.defineProperty(RN, 'Image', {
      get() {
        return PatchedImage;
      },
      configurable: true,
    });
  } catch (e) {
    RN.Image = PatchedImage;
  }
}

// 2. Patch react-native ImageBackground component
const OriginalImageBackground = RN.ImageBackground;
if (OriginalImageBackground) {
  const PatchedImageBackground = React.forwardRef((props, ref) => {
    const newProps = { ...props };
    if (props.source) {
      newProps.source = formatImageSource(props.source);
    }
    if (props.defaultSource) {
      newProps.defaultSource = formatImageSource(props.defaultSource);
    }
    return <OriginalImageBackground {...newProps} ref={ref} />;
  });

  // Copy all static properties
  Object.keys(OriginalImageBackground).forEach((key) => {
    PatchedImageBackground[key] = OriginalImageBackground[key];
  });

  try {
    Object.defineProperty(RN, 'ImageBackground', {
      get() {
        return PatchedImageBackground;
      },
      configurable: true,
    });
  } catch (e) {
    RN.ImageBackground = PatchedImageBackground;
  }
}

// 3. Patch react-native-fast-image if it is loaded
try {
  const FastImageModule = require('react-native-fast-image');
  if (FastImageModule && FastImageModule.default) {
    const OriginalFastImage = FastImageModule.default;
    const PatchedFastImage = React.forwardRef((props, ref) => {
      const newProps = { ...props };
      if (props.source) {
        newProps.source = formatImageSource(props.source);
      }
      if (props.defaultSource) {
        newProps.defaultSource = formatImageSource(props.defaultSource);
      }
      return <OriginalFastImage {...newProps} ref={ref} />;
    });

    Object.keys(OriginalFastImage).forEach((key) => {
      PatchedFastImage[key] = OriginalFastImage[key];
    });

    FastImageModule.default = PatchedFastImage;
  }
} catch (e) {
  // Silent catch if react-native-fast-image is not installed
}
