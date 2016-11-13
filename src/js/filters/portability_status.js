'use strict';

import ViewModel from "../viewmodels/default_view_model";
import ViewFilter from "./view_filter";

export const PortabilityStatus = {
    ALL: '0',
    ONLY: '1',
    WITH: '2',
    NOT_SAME: '3'
}

export default class PortabilityFilter extends ViewFilter {
    constructor() {
        super(PortabilityFilter.Name());
    }

    static Name() {
        return 'portability_status';
    };

    getDefaultFilterValues(language, data) {
        return PortabilityStatus.ALL;
    }


    applyFilter(viewModel, filterValues) {
        console.log('Apply ' + this.getName() + ' filter');

        if (!(viewModel instanceof ViewModel)) {
            throw Error('filteredData is not of type ViewModel. filteredData=' + viewModel.constructor.name);
        }
        let that = this;

        if(filterValues.portability_status === undefined){
            console.error('portability_status is undefined');
            return;
        }

        let engines = Object.keys(filterValues.engines);
        let summaryOutdated = true;

        // Use reserve loop to iterate und mutating an array
        for(var i=viewModel.constructs.length -1; i >= 0; i -=1){
            let construct = viewModel.constructs[i];

            if (filterValues.portability_status === PortabilityStatus.NOT_SAME) {

                var showFeatures = that._filterFeaturesByNotSameStatus(construct, engines);
                if (showFeatures.length < 1) {
                   viewModel.constructs.splice(i, 1);
                    summaryOutdated = true;
                    continue;
                }
                construct.features = showFeatures;
                if (construct.features < 2) {
                    construct.moreThanTwoFeatures = false;
                }
                construct.features[construct.features.length - 1]['lastFeature'] = true;
            } else {
                if (!that._isConstructMatchingPortabilityStatus(construct, filterValues)) {
                    viewModel.constructs.splice(i, 1);
                    summaryOutdated = true;
                    continue;
                }
            }
        }

        if(summaryOutdated){
            viewModel.updateSummaryRow();
        }
        console.log(viewModel);
    }


    _filterFeaturesByNotSameStatus(construct, engines) {
        var showFeatures = [];

        let that = this;
        construct.features.forEach(function (feature) {
            if (that._isMatchingPortabilityStatusFeature(feature, engines)) {
                showFeatures.push(feature);
            }
        });

        return showFeatures;
    }

    _isConstructMatchingPortabilityStatus(construct, filterValues) {
        if (filterValues.portability_status === PortabilityStatus.ALL) {
            return true;
        }

        let engines = Object.keys(filterValues.engines);
        let countFullSupported = this._getNumberOfFullSupportedTests(construct, engines);

        if (filterValues.portability_status === PortabilityStatus.ONLY && countFullSupported != engines.length) {
            return false;
        } else if (filterValues.portability_status === PortabilityStatus.WITH && (countFullSupported === engines.length)) {
            return false;
        }

        return true;
    }


    _getNumberOfFullSupportedTests(construct, enginesArray){
        let count = enginesArray.length;

        enginesArray.forEach(function (engineId) {
            // If any test for this engine exists or fullSupport is false
            if (!construct['supportStatus'].hasOwnProperty(engineId) || !construct['supportStatus'][engineId].fullSupport) {
                count -= 1;
            }
        });

        return count;
    }

    _isMatchingPortabilityStatusFeature(feature, engines) {
        let showFeature = false;
        let firstResult = undefined;

        engines.forEach(function (engineId) {

            // If any test for this engine exists or support same
            if (!feature.results.hasOwnProperty(engineId)) {
                showFeature = true;
                return;
            }

            if (firstResult === undefined) {
                firstResult = feature.results[engineId].result.testResult
            }

            if (firstResult !== feature.results[engineId].result.testResult) {
                showFeature = true;
                return;
            }

        });

        return showFeature;
    }


}