'use strict';

import {fetchBetsyData} from './fetch'
import {fetchBenFlowData} from './fetch'
import DataModel from './model/data_model'
import {normalizeByCapability} from "./normalizer";
import FilterManager from "./filter_manager";
import GroupFilter from "./filters/group_filter";
import LanguageFilter from "./filters/language_filter";
import EngineFilter from "./filters/engine_filter";
import ConstructFilter from "./filters/construct_filter";
import FeatureFilter from "./filters/feature_filter";
import PortabilityFilter from "./filters/portability_status";
import ViewModelConverter from "./filters/view_model_converter";
import TestDataModel from "./model/test_data";
import TestsFilter from "./filters/tests_filter";
import {CapabilityTableComponent} from "./components/capability_table";
import {EnginesFilterComponent} from "./components/engines_filters";
import {FCGFiltersComponent} from "./components/fcg_filters";


var page, capability, filteredData, htmlData, dataFilters, numberOfreceivedData, normalizedData;
var rawData;

export function Peace(page) {
    if (page === undefined || page == null) {
        console.error('page is undefined');
        return false;
    }

    loadData(page)
        .then(res => {
            rawData = createDataModel(res);
            process(page);
        }).catch(function (err) {
        console.error(err);
    });


    //console.log(rawData);
}


function loadData(page) {
    if (page === 'conformance' || page === 'expressiveness' || page === 'engines-overview' || page === 'engines-compare') {
        return fetchBetsyData();
    } else if (page === 'performance') {
        return fetchBenFlowData();
    } else {
        throw Error("Unsupported page");
    }
}

function createDataModel(results) {
    var objResults = {};
    results.forEach(function (row) {
        objResults[row.name] = row.result;
    });

    return new DataModel(objResults);

    /*rawData = {tests: [], testsIndependent: [], featureTree: [], engines: [], metrics: []};
     filteredData = {groups: [], engines: [], constructs: [], features: []};
     normalizedData = [];
     htmlData = {constructs: [], summaryRow: {'totalConstructs': 0}};
     dataFilters = {
     language: 'BPMN',
     groups: undefined,
     constructs: undefined,
     features: undefined,
     portability_status: 0
     } */

}


function process(page) {
    if (!(rawData instanceof DataModel)) {
        console.log('Failed to initialize JSON rawData');
        return;
    }
    if (page === 'conformance' || page === 'expressiveness' || page === 'performance') {
        let capability = page;
        let testData = new TestDataModel(rawData.getTestsByCapability(capability));
        let normalizedCapabilityData = normalizeByCapability(rawData, capability, testData.tests);

        var capabilityData = normalizedCapabilityData.getAll();

        let defaultLang = 'BPMN';
        if (!capabilityData.hasLanguage(defaultLang)) {
            console.warn(defaultLang + " does not exist")
        }

        let filteredData = {
            capability: capability,
            groups: {},
            engines: {},
            constructs: {},
            features: {},
            tests: {},
            independentTests: {}
        };

        //TODO Rename to ProcessPipeline
        let filterManager = new FilterManager(capabilityData, testData, filteredData);
        // Adding order represents the calling order. It must be adhered to
        filterManager.addFilter(new LanguageFilter(), defaultLang);
        filterManager.addFilter(new EngineFilter(), []);
        filterManager.addFilter(new GroupFilter(), []);
        filterManager.addFilter(new ConstructFilter(), []);
        filterManager.addFilter(new FeatureFilter(), []);
        filterManager.addFilter(new TestsFilter(), []);
        //TODO add test file filter

        let langFilterValue = filterManager.getFilterValue(LanguageFilter.Name());
        if (langFilterValue == undefined) {
            console.error('Filter values of Filter: ' + LanguageFilter.Name() + ' is undefined');
        }

        filterManager.applyAllFilters();

        let viewConverter = new ViewModelConverter();
        var viewModel = viewConverter.convert(filterManager.getFilteredData(), capability, langFilterValue);

        let portabilityFilter = new PortabilityFilter();
        portabilityFilter.applyFilter(null, null, viewModel, filterManager.getFilterValues());


        let capabilityTableComponent = new CapabilityTableComponent(viewModel);

        //TODO check if allEngines is undefined
        let allEngines = capabilityData.getEnginesByLanguage(filterManager.getFilterValues().language);
        let latestVersionValues = EngineFilter.createFilterValues(capabilityData.getLatestEngineVersions(filterManager.getFilterValues().language));

        let filterComponent = new EnginesFilterComponent({
            viewModel: {
                engines: allEngines.data,
                latestVersionValues: latestVersionValues,
                filterValues: filterManager.getFilterValues()
            },
            onFilter: function (newFilterValues) {
                filterManager.applyFilter(EngineFilter.Name(), newFilterValues.engines);
                filterManager.applyFilter(TestsFilter.Name());

                viewModel = viewConverter.convert(filterManager.getFilteredData(), capability, langFilterValue);
                //  portabilityFilter.applyFilter(null, null, viewModel, filterManager.getFilterValues());
                capabilityTableComponent.updateModel(viewModel);
            }
        });

        new FCGFiltersComponent({
            dimension: 'groups',
            dimensionData: capabilityData.getAllGroupsByLanguage(filterManager.getFilterValues().language).data,
            filterValues: filterManager.getFilterValues(),
            onFilter: function (newFilterValues) {
                filterManager.applyFilter(GroupFilter.Name(), newFilterValues.groups);
                filterManager.applyFilter(ConstructFilter.Name(), newFilterValues.constructs);
                filterManager.applyFilter(FeatureFilter.Name(), newFilterValues.features);
                filterManager.applyFilter(TestsFilter.Name());

                viewModel = viewConverter.convert(filterManager.getFilteredData(), capability, langFilterValue);
                capabilityTableComponent.updateModel(viewModel);
            }
        });


        new FCGFiltersComponent({
            dimension: 'constructs',
            dimensionData: capabilityData.getAllConstructsByLanguage(filterManager.getFilterValues().language).data,
            filterValues: filterManager.getFilterValues(),
            onFilter: function (newFilterValues) {
                filterManager.applyFilter(ConstructFilter.Name(), newFilterValues.constructs);
                filterManager.applyFilter(FeatureFilter.Name(), newFilterValues.features);
                filterManager.applyFilter(TestsFilter.Name());

                viewModel = viewConverter.convert(filterManager.getFilteredData(), capability, langFilterValue);
                capabilityTableComponent.updateModel(viewModel);
            }
        });


        //filteredData['independentTests'] = _.where(rawData.independentTests, {language: langFilterValue});


        // let htmlData = prepareHtmlData(capability, filteredData, filterManager.getFilterValues(), testData);
        // buildFilterItems(capability);
        //renderCapabilityTable(capability, htmlData, filterManager.getFilterValues());
        /*
         prepareHtmlData();
         buildFilterItems();
         renderCapabilityTable();*/
    } else if (page === 'engines-overview') {
        engineOverview();
    } else if (page === 'engines-compare') {
        engineCompare();
    }
}

/*
 page = benchmarkType;
 capability = benchmarkType;

 rawData = {tests: [], testsIndependent: [], featureTree: [], engines: [], metrics: []};
 filteredData = {groups: [], engines: [], constructs: [], features: []};
 normalizedData = [];
 htmlData = {constructs:[], summaryRow: {'totalConstructs' : 0} };
 dataFilters = { language:   'BPMN', groups: undefined, constructs: undefined, features: undefined, portability_status: 0}


 numberOfreceivedData = 0;
 var totalJSONFiles = (page === 'performance') ? 5 : 4;

 if(page === 'conformance' || page === 'expressiveness' || page === 'engines-overview'
 || page === 'engines-compare'){
 getJSON("../rawData/tests-engine-dependent.json", setDataCallback('tests', totalJSONFiles));
 getJSON("../rawData/feature-tree.json", setDataCallback('featureTree', totalJSONFiles));
 getJSON("../rawData/engines.json", setDataCallback('engines', totalJSONFiles));
 getJSON("../rawData/tests-engine-independent.json", setDataCallback('independentTests', totalJSONFiles));
 } else if(page === 'performance'){
 getJSON("../rawData/benchflow-tests-engine-dependent.json", setDataCallback('tests', totalJSONFiles));
 getJSON("../rawData/benchflow-feature-tree.json", setDataCallback('featureTree', totalJSONFiles));
 getJSON("../rawData/benchflow-tests-engine-independent.json", setDataCallback('independentTests', totalJSONFiles));
 getJSON("../rawData/benchflow-engines.json", setDataCallback('engines', totalJSONFiles));
 getJSON("../rawData/metrics.json", setDataCallback('metrics', totalJSONFiles));
 }


 return peace;
 }

 function setDataCallback(dataType, totalJSONFiles){
 return function(jsonData, textStatus, jqXHR) {
 if(dataType === 'tests'){
 rawData.tests = jsonData;
 } else if(dataType === 'featureTree'){
 rawData.featureTree = jsonData;
 if(page !== 'engines-overview' && page !== 'engines-compare'){
 udpateFeatureTreeByCapability();
 }
 } else if(dataType === 'engines'){
 rawData.engines = jsonData;
 } else if(dataType === 'independentTests'){
 rawData.independentTests = jsonData;
 } else if(dataType === 'metrics'){
 rawData.metrics = jsonData[0];
 }

 numberOfreceivedData++;
 if(numberOfreceivedData === totalJSONFiles){
 if(rawData.featureTree === undefined) {
 console.error('Capability not found in the dataset')
 return false;
 }
 process();

 }
 }
 }



 }

 function udpateFeatureTreeByCapability(cap){
 if(cap !== undefined) { capability = cap }

 rawData.featureTree = _.find(rawData.featureTree, function(feature){
 return feature.id.toLowerCase() == capability.toLowerCase();
 });
 } */
