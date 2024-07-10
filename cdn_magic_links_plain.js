// cdn_magic_links.js - Version 1.0.1

document.addEventListener("DOMContentLoaded", function() {
    const DebugLevels = {
        NONE: 0,
        ERROR: 1,
        WARN: 2,
        INFO: 3,
        DEBUG: 4
    };

    let currentDebugLevel = DebugLevels.DEBUG;

    function setDebugLevel(level) {
        currentDebugLevel = level;
    }

    function log(level, ...args) {
        if (level <= currentDebugLevel) {
            const prefix = Object.keys(DebugLevels).find(key => DebugLevels[key] === level);
            console.log(`[${prefix}]`, ...args);
        }
    }

    function logDeviceInfo() {
        const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        const pixelRatio = window.devicePixelRatio || 1;
        
        log(DebugLevels.INFO, `Device Info:`);
        log(DebugLevels.INFO, `- Screen size: ${width}x${height}`);
        log(DebugLevels.INFO, `- Pixel ratio: ${pixelRatio}`);
        log(DebugLevels.INFO, `- Effective resolution: ${width * pixelRatio}x${height * pixelRatio}`);
    }

    logDeviceInfo();

    const imgElements = document.querySelectorAll('img');

    const updateImage = function(img) {
        try {
            const originalUrl = img.getAttribute('data-original-src') || img.getAttribute('data-src') || img.getAttribute('src');
            if (!originalUrl) throw new Error('No original URL found');
            if (!originalUrl.includes("cdn.intelligencebank.com")) throw new Error('Not a valid CDN URL');
            
            log(DebugLevels.DEBUG, 'Original URL:', originalUrl);
            const transformations = getBestPracticeTransformations(img);
            const transformedUrl = transformUrl(originalUrl, transformations);
            log(DebugLevels.INFO, 'Transformed URL:', transformedUrl);
            img.src = transformedUrl;
        } catch (error) {
            log(DebugLevels.ERROR, `Error updating image: ${error.message}`);
            if (img.getAttribute('data-original-src')) {
                img.src = img.getAttribute('data-original-src');
            }
        }
    };

    function getBestPracticeTransformations(img) {
        function getEffectiveDimensions(element) {
            const container = element.closest('.image-container, .fixed-height, .fixed-height-gallery');
            let width = container ? container.offsetWidth : document.body.offsetWidth;
            let height = null;
    
            if (element.classList.contains('half-width')) {
                width = Math.floor(width / 2);
            } else if (element.classList.contains('third-width')) {
                width = Math.floor(width / 3);
            }
    
            if (container && (container.classList.contains('fixed-height') || container.classList.contains('fixed-height-gallery'))) {
                height = container.offsetHeight;
                if (container.classList.contains('fixed-height-gallery')) {
                    width = Math.floor(width / 3);
                }
            }
    
            return { width, height };
        }
    
        const { width: effectiveWidth, height: effectiveHeight } = getEffectiveDimensions(img);
        log(DebugLevels.DEBUG, `Effective dimensions: ${effectiveWidth}x${effectiveHeight}`);
    
        const pixelRatio = window.devicePixelRatio || 1;
        const customQuality = img.getAttribute('data-quality') || '80';
        const customFormat = img.getAttribute('data-format') || 'webp';
    
        const sizeTiers = [320, 480, 640, 800, 1024, 1280, 1600, 2048];
        let baseSizeTier = sizeTiers[sizeTiers.length - 1];
    
        for (let i = 0; i < sizeTiers.length; i++) {
            if (effectiveWidth <= sizeTiers[i]) {
                baseSizeTier = sizeTiers[i];
                break;
            }
        }
    
        const size = Math.min(Math.round(baseSizeTier * pixelRatio), 2048);
    
        log(DebugLevels.DEBUG, `Image: ${img.alt}, Effective width: ${effectiveWidth}, Effective height: ${effectiveHeight}, Pixel ratio: ${pixelRatio}, Base size tier: ${baseSizeTier}, Final size: ${size}`);
    
        const transformations = {
            ext: customFormat,
            size: size.toString(),
            quality: customQuality
        };
    
        if (effectiveHeight) {
            const scaledHeight = Math.round(effectiveHeight * pixelRatio);
            transformations.crop = `${size}x${scaledHeight}a0a0`;
            transformations.cropgravity = 'center';
            log(DebugLevels.DEBUG, 'Crop applied:', transformations.crop);
        } else {
            log(DebugLevels.DEBUG, 'No crop applied');
        }
    
        return transformations;
    }

    function transformUrl(url, transformations) {
        let transformationString = '';

        for (const [key, value] of Object.entries(transformations)) {
            transformationString += `${key}=${value}&`;
        }

        transformationString = transformationString.slice(0, -1);
        log(DebugLevels.DEBUG, 'Transformation String:', transformationString);

        const urlParts = url.split('/');
        if (urlParts.length > 2) {
            urlParts[urlParts.length - 2] = transformationString;
        }
        const newUrl = urlParts.join('/');
        log(DebugLevels.DEBUG, 'Reconstructed URL:', newUrl);

        return newUrl;
    }

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                updateImage(img);
                observer.unobserve(img);
            }
        });
    }, observerOptions);

    imgElements.forEach(img => {
        const originalSrc = img.getAttribute('data-src') || img.getAttribute('src');
        if (originalSrc) {
            img.setAttribute('data-original-src', originalSrc);
            img.removeAttribute('src');
            log(DebugLevels.DEBUG, 'Data Original Src Set:', originalSrc);
            observer.observe(img);
        } else {
            log(DebugLevels.WARN, 'No valid source found for image:', img);
        }
    });
});
