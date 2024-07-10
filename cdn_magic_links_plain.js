// cdn_magic_links.js - Version 1.0.2

document.addEventListener("DOMContentLoaded", function() {
    const DebugLevels = {
        NONE: 0,
        ERROR: 1,
        WARN: 2,
        INFO: 3,
        DEBUG: 4
    };

    let currentDebugLevel = DebugLevels.DEBUG;

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

    function getEffectiveDimensions(element) {
        let width = 0;
        let currentElement = element;

        while (currentElement && width === 0) {
            width = currentElement.offsetWidth;
            currentElement = currentElement.parentElement;
        }

        log(DebugLevels.DEBUG, `Effective width calculated: ${width}`);
        return { width };
    }

    function getBaseSizeTier(width) {
        const sizeTiers = [320, 480, 640, 800, 1024, 1280, 1600, 2048];
        for (let i = 0; i < sizeTiers.length; i++) {
            if (width <= sizeTiers[i]) {
                return sizeTiers[i];
            }
        }
        return sizeTiers[sizeTiers.length - 1];
    }

    function getBestPracticeTransformations(img) {
        const { width: effectiveWidth } = getEffectiveDimensions(img);
        log(DebugLevels.DEBUG, `Effective width: ${effectiveWidth}`);

        const pixelRatio = window.devicePixelRatio || 1;
        const customQuality = img.getAttribute('data-quality') || '80';
        const customFormat = img.getAttribute('data-format') || 'webp';

        const cappedWidth = Math.min(effectiveWidth, 2048);
        const baseSizeTier = getBaseSizeTier(cappedWidth);
        const size = Math.round(baseSizeTier * pixelRatio);

        log(DebugLevels.DEBUG, `Image: ${img.alt}, Effective width: ${effectiveWidth}, Capped width: ${cappedWidth}, Pixel ratio: ${pixelRatio}, Base size tier: ${baseSizeTier}, Final size: ${size}`);

        const transformations = {
            ext: customFormat,
            size: size.toString(),
            quality: customQuality
        };

        return transformations;
    }

    function transformUrl(url, transformations) {
        let transformationString = Object.entries(transformations)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');

        log(DebugLevels.DEBUG, 'Transformation String:', transformationString);

        const urlParts = url.split('/');
        if (urlParts.length > 2) {
            urlParts[urlParts.length - 2] = transformationString;
        }
        const newUrl = urlParts.join('/');
        log(DebugLevels.DEBUG, 'Reconstructed URL:', newUrl);

        return newUrl;
    }

    function updateImage(img) {
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
