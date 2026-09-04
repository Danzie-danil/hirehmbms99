// Keep large badge artwork as browser-cacheable image files instead of inline JS data URIs.
window.ENTERPRISE_DIAMOND_DATA = '/enterpriseimage.png';
window.EXCLUSIVE_DIAMOND_DATA = '/exclusiveimage.png';

window.getEnterpriseBadgeSrc = function() {
    return window.ENTERPRISE_DIAMOND_DATA;
};

window.getExclusiveBadgeSrc = function() {
    return window.EXCLUSIVE_DIAMOND_DATA;
};
