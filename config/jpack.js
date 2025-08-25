import { jPackConfig } from 'jizy-packer';

const jPackData = function () {
    jPackConfig.sets({
        name: 'jFetch',
        alias: 'jizy-api'
    });

    jPackConfig.set("onCheckConfig", () => { });
    jPackConfig.set("onGenerateBuildJs", (code) => code);
    jPackConfig.set("onGenerateWrappedJs", (wrapped) => wrapped);
    jPackConfig.set("onPacked", () => { });
};

export default jPackData;