// Last update: 26062024 - Version 1.0

document.addEventListener("DOMContentLoaded", function() {
    const DebugLevels = {
        NONE: 0,
        ERROR: 1,
        WARN: 2,
        INFO: 3,
        DEBUG: 4
    };

    let currentDebugLevel = DebugLevels.INFO;

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
            const transformedUrl = transformUrl(originalUrl, img);
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
        let parent = img.parentElement;
        let parentWidth = parent.offsetWidth;
        
        while (parentWidth === 0 && parent.parentElement) {
            parent = parent.parentElement;
            parentWidth = parent.offsetWidth;
        }

        const pixelRatio = window.devicePixelRatio || 1;
        const customQuality = img.getAttribute('data-quality') || '80';
        const customFormat = img.getAttribute('data-format') || 'webp';
        
        const maxParentSize = 2048;
        const cappedParentWidth = Math.min(parentWidth, maxParentSize);

        const sizeTiers = [320, 480, 640, 800, 1024, 1280, 1600, 2048];
        let baseSizeTier;

        for (let i = 0; i < sizeTiers.length; i++) {
            if (cappedParentWidth <= sizeTiers[i] || i === sizeTiers.length - 1) {
                baseSizeTier = sizeTiers[i];
                break;
            }
        }

        const size = Math.round(baseSizeTier * pixelRatio);

        log(DebugLevels.DEBUG, `Image: ${img.alt}, Parent width: ${parentWidth}, Capped width: ${cappedParentWidth}, Pixel ratio: ${pixelRatio}, Base size tier: ${baseSizeTier}, Final size: ${size}`);

        let currentElement = parent;
        let parentHeightSet = false;
        let parentHeight = 0;
        let parentElementInfo = null;

        while (currentElement && currentElement !== document.documentElement) {
            const computedStyle = getComputedStyle(currentElement);
            const height = computedStyle.height;
            const styleHeight = currentElement.style.height;

            if (height !== 'auto' && height.includes('px') && (styleHeight || currentElement.classList.contains('set-height'))) {
                parentHeightSet = true;
                parentHeight = parseInt(height, 10);
                parentElementInfo = currentElement;
                break;
            }
            currentElement = currentElement.parentElement;
        }

        log(DebugLevels.DEBUG, 'Parent height set:', parentHeightSet, 'Parent height:', parentHeight);
        if (parentHeightSet) {
            log(DebugLevels.DEBUG, 'Parent element with height:', parentElementInfo);
            log(DebugLevels.DEBUG, 'Parent element HTML:', parentElementInfo.outerHTML);
        }

        let crop;
        if (parentHeightSet && parentHeight > 100) {
            crop = `${size}x${parentHeight}a0a0`;
        } else {
            crop = null;
        }

        const transformations = {
            ext: customFormat,
            size: size.toString(),
            quality: customQuality
        };

        if (crop) {
            transformations.crop = crop;
            transformations.cropgravity = 'center';
        }

        return transformations;
    }

    function transformUrl(url, img) {
        const transformations = getBestPracticeTransformations(img);
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
