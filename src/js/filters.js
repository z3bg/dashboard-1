

    function initFilter(callback){
      
       data.featureTree.languages.forEach(function(obj){
            normalizedData[obj.name]               = normalizeFeatureTree(obj);
            normalizedData[obj.name]['engines']    = sortDataAlphabetic(
                                                            copyEngines(_.where(data.engines, {language:obj.name})), 'name');
            addIndexToEngines(normalizedData[obj.name]['engines']);
       });
       
        filterByLanguage();
        setupFilters();
        filteredData['independentTests'] = _.where(data.independentTests, {language: dataFilters.language });

    }

    function setupFilters(){
        if(dataFilters.groups == undefined){ dataFilters.groups = []; } 
        if(dataFilters.engines == undefined || dataFilters.engines.length == 0){ dataFilters.engines = getLatestEngineVersions();}
        if(dataFilters.constructs == undefined){ dataFilters.constructs =  []; }  
        if(dataFilters.features == undefined){ dataFilters.features =  []; } 

         filterByGroup();
         filterByEngines();
         filterByConstruct();
         filterByFeature();
    }

    function resetFilters(){
        dataFilters.groups.length = 0; 
        dataFilters.engines.length = 0; 
        dataFilters.constructs.length = 0; 
        dataFilters.features.length = 0; 

        htmlData.constructs.length = 0;
        htmlData.summaryRow = {totalConstructs : 0};
        
        filteredData.groups.length = 0; 
        filteredData.constructs.length = 0; 
        filteredData.features.length = 0;
        filteredData.independentTests.length = 0;
    }
    
    function addIndexToEngines(engines){
       engines.forEach(function(engine, index){engine['engineIndex'] = index})
    }

    function normalizeFeatureTree(featureTree){
        var cTotalLength = 0;
        var fTotalLength = 0;
        var currentConstructIndex = 0; 
        var currentFeatureIndex = 0; 

        var data = {groups: [], engines: [], constructs: [], features: []};

        var sortedGroups = sortDataAlphabetic(featureTree.groups, 'name');
        data.groups = sortedGroups.map(function(group, gIndex){

            var sortedConstructs =  sortDataAlphabetic(group.constructs, 'name');
            sortedConstructs.forEach(function(construct, cIndex){

                var sortedFeatures =  sortDataAlphabetic(construct.features, 'name'); 
                sortedFeatures.forEach(function(feature, fIndex){
                    var _features =  {
                        name: feature.name.replaceAll('_', ' '),
                        description: feature.description,
                        id: feature.id,
                        upperBound: feature.upperBound,
                        lastFeature: false,
                        groupId: group.id,
                        groupName: capitalizeFirstLetter(group.name.replaceAll('_', ' ')),
                        groupIndex: gIndex,
                        constructIndex: currentConstructIndex,
                        featureIndex: currentFeatureIndex,
                        testIndexes: getTestIndexesByFeatureID(feature.id)
                    }
                    data.features.push(_features);
                    currentFeatureIndex++;
                });

      
                var start = fTotalLength;
                fTotalLength += construct.features.length;
                var end = fTotalLength;

                var _constructs =  {
                        name: construct.name.replaceAll('_', ' '),
                        description: construct.description,
                        id: construct.id,
                        groupId: group.id,
                        groupName: capitalizeFirstLetter(group.name.replaceAll('_', ' ')),
                        groupDesc: group.description,
                        isFirstEntry: false,
                        groupIndex: gIndex,
                        featureIndexes:_.range(start, end)
                }

                data.constructs.push(_constructs);  
                currentConstructIndex++;
            });

            var start = cTotalLength;
            cTotalLength += group.constructs.length;
            var end = cTotalLength;
            return {
                name: capitalizeFirstLetter(group.name.replaceAll('_', ' ')),
                description: group.description,
                id: group.id,
                constructIndexes: _.range(start, end)
            }
        });

        return data;
    }

    function filterByLanguage(){ 
        if(dataFilters.language == undefined){ dataFilters.language = 'BPMN'}
        filteredData = copyNormalizedData(dataFilters.language);
    }

    function getNormalizedDataByLang(){
        return normalizedData[dataFilters.language];
    }

    function getAllLanguages(){
        return data.featureTree.languages.map(function(lang){return lang.name;});
    }

    function filterByEngines(){
        var missingKeys = isFilteredDataEnough('engines'); 
        if(missingKeys.length > 0){
            filteredData.engines = copyEngines(normalizedData[dataFilters.language].engines); 
        }

        if(dataFilters.engines.length === 0) { dataFilters.engines = getLatestEngineVersions(); }

        filteredData.engines.forEach(function(engine, index){
            if(engine !== undefined) {  
                if(dataFilters.engines.indexOf(engine.id) === -1){
                    filteredData.engines[index]  = undefined; 
                }
           }
        });

  
    }
    
    //If any construct filter option is turned on, then checks constructs of this newly added group
    // if none filter option is checked (i.e. == 'all') every constructs we be shown anyway   
    function addNewGroupsToFilters(constructIndexes){
        if(dataFilters.constructs.length > 0){
            constructIndexes.forEach(function(constructID){
                if(dataFilters.constructs.indexOf(getNormalizedDataByLang().constructs[constructID].name) == -1){
                  dataFilters.constructs.push(getNormalizedDataByLang().constructs[constructID].name);  
                }
            });
        }
    }

    function filterByGroup(){             
        // should we preserve filteredData ?
        var missingKeys = isFilteredDataEnough('groups'); 
        if(missingKeys.length > 0){ 
            missingKeys.forEach(function(groupName){
               var index = _.findIndex(getNormalizedDataByLang().groups, function(group){return group.name == groupName});
                //TODO use own deep copy method
                filteredData.groups[index] = $.extend(true, {}, getNormalizedDataByLang().groups[index]);
                addNewGroupsToFilters(filteredData.groups[index].constructIndexes);
            });
        }

        filteredData.groups.forEach(function(group, index){
            if(group !== undefined) {  
                 var filterPredicate = (dataFilters.groups.length == 0) ? false : (dataFilters.groups.indexOf(group.name) == -1);  
            
                if(filterPredicate){
                    filteredData.groups[index]  = undefined; 
                }
           }
        });
        
    }

    function filterByConstruct(){ 
        var missingKeys = isFilteredDataEnough('constructs'); 

        if(missingKeys.length > 0){ 
            missingKeys.forEach(function(constructName){
               var index = _.findIndex(getNormalizedDataByLang().constructs, function(construct){return construct.name == constructName});
                filteredData.constructs[index] = $.extend(true, {}, getNormalizedDataByLang().constructs[index]); 
            });
        }      

        filteredData.constructs.forEach(function(construct, index){
            if(construct !== undefined) {  
                var filterPredicate = (dataFilters.constructs.length == 0) ? false : (dataFilters.constructs.indexOf(construct.name) == -1);  
                if((filterPredicate || filteredData.groups[construct.groupIndex] == undefined)){
                    filteredData.constructs[index]  = undefined; 
                }
            }
        });
    }

    function filterByFeature(){ 
        var missingKeys = isFilteredDataEnough('features'); 
        if(missingKeys.length > 0){ 
              missingKeys.forEach(function(featureName){
                var index = _.findIndex(getNormalizedDataByLang().features, function(feature){return feature.name == featureName});
                filteredData.features[index] = $.extend(true, {}, getNormalizedDataByLang().features[index]); 
            });          
         }

        filteredData.features.forEach(function(feature, index){
            if(feature !== undefined) {  
                var filterPredicate = (dataFilters.features.length == 0) ? false : (dataFilters.features.indexOf(feature.name) == -1); 
               if(feature !== undefined && (filterPredicate || (filteredData.constructs[feature.constructIndex] == undefined))){
                 filteredData.features[index]  = undefined; 
               }
            }
        });

    }

    function getAllGroupsName(){
        return getNormalizedDataByLang().groups.map(function (group){ return group.name});
    }

    function getAllConstructsName(){
        return getNormalizedDataByLang().constructs.map(function(construct){ return construct.name; });
    }

    function getAllFeaturesName(){
        return getNormalizedDataByLang().features.map(function(feature){ return feature.name; });
    
    }

    function getEnginesByLanguage(){ 
        return normalizedData[dataFilters.language].engines;
    }

    var sortVersionAscending = function(a, b){
        return a.id.localeCompare(b.id);
    }

    function getLatestEngineVersions(){
        var latestVersions =  _.chain(getEnginesByLanguage())
            .groupBy('name')
            .map(function(val, key){
                var sortedInstances = val.sort(sortVersionAscending).reverse();
                var i=0;
                var versions = [];
                var max = sortedInstances.length;
                var engine;

                while(i < max){
                    engine=sortedInstances[i];
                    if (engine.configuration.length!=0){
                        i++;
                    }else {
                        versions.push(engine.id);
                        i=max;
                    }
                }
                if (versions.length==0&&max>0){
                    versions.push(sortedInstances[0].id);
                }
                return versions;
        }).value();

        return  _.flatten(latestVersions, true); 
    }




    function filter(type, callAfterFiltering ){
        //filter order: engines#2
        if(type === 'language'){
            resetFilters();
            initFilter();
            prepareHtmlData();
            reBuildFilterItems();
            renderCapabilityTable();
        } else if(type === 'groups'){
            filterByGroup();
            filterByConstruct();
            filterByFeature();
            prepareHtmlData();
            buildConstructsFilter();
            buildFeaturesFilter();
            renderCapabilityTable();
        } else if(type === 'constructs'){
            filterByConstruct();
            filterByFeature();
            prepareHtmlData();
            buildFeaturesFilter();
            renderCapabilityTable();
        } else if(type === 'features'){
            filterByFeature();
            prepareHtmlData();
            renderCapabilityTable();
        } else if(type === 'engines'){
            filterByEngines();
            if(callAfterFiltering !== undefined){ callAfterFiltering();}
            prepareHtmlData();
            renderCapabilityTable();
        } else if(type === 'portability_status'){
            prepareHtmlData();
            renderCapabilityTable();
        }
    }

    function isFilteredDataEnough(type){
        if(type === undefined){ return false };

        var dimensionKey;
        if(type == 'groups' || type == 'features'){
           dimensionKey = 'name'; 
        } else if(type == 'engines'){
           dimensionKey = 'id'; 
        }  

        var query = {};
        var missingKeys = [];

        var currentDataFilter;
         if(dataFilters[type].length == 0 && type == 'groups'){
            currentDataFilter = getAllGroupsName();  
        } else if(dataFilters[type].length == 0 && type == 'constructs'){
            currentDataFilter = getAllConstructsName();  
        } else if(dataFilters[type].length == 0 && type == 'features'){
           currentDataFilter = getAllFeaturesName();   
        } else if(dataFilters[type].length == 0 && type == 'engines'){
           currentDataFilter = getLatestEngineVersions();
        } else {
          currentDataFilter =  dataFilters[type]; 
        }

        for(var key in currentDataFilter){
            if(type === 'constructs'){
                if(_.findWhere(filteredData.constructs, {name : currentDataFilter[key]})  == undefined) { 
                    missingKeys.push(currentDataFilter[key]);
                }
    
            } else if(type === 'groups' || type === 'features') {
                query[dimensionKey] = currentDataFilter[key];
                  if(_.findWhere(filteredData.groups, query) == undefined) { 
                        missingKeys.push(currentDataFilter[key]);
                    }
            } else if( type === 'features') {
                query[dimensionKey] = currentDataFilter[key];
                  if(_.findWhere(filteredData.features, query) == undefined) { 
                        missingKeys.push(currentDataFilter[key]);
                    }
            }  else if(type === 'engines' ) {
                query[dimensionKey] = currentDataFilter[key];
                  if(_.findWhere(filteredData.engines, query) == undefined) { 
                        missingKeys.push(currentDataFilter[key]);
                    }
            }
        }
        return missingKeys;
    }

    function hasEngineID(test){
        return dataFilters.engines.indexOf(test.engineID) > -1;
    }


    function getTestIndependentInfo(featureId){
       return _.findWhere(filteredData.independentTests, {featureID:featureId});
    }

    function getFeatureTestByEngine(feature, engineID){
        var result;
        for(var i=0, length=feature.testIndexes.length; i < length; i++){
            var testIndex = feature.testIndexes[i];
            if(data.tests[testIndex].engineID == engineID){
                result = data.tests[testIndex];
            }
           if(result !== undefined) return result;
        }
        return undefined;
    }

    function getTestIndexesByFeatureID(featureID){
        var index = [];
        data.tests.forEach(function(test, key){
            if (test.featureID == featureID){
                index.push(key);
            }
        });
        return index;
    }

    function findTestByFeatureID(featureID){
        return data.tests.filter(function(test){
            return (test.featureID == featureID);
        });
    }




 function copyNormalizedData(lang){
    var copy = {groups: [], engines: [], constructs: [], features: []};
    
    for (var dimension in normalizedData[lang]){

        if(dimension == 'groups'){
            for (var key in normalizedData[lang][dimension]){
                 copy[dimension][key] = {
                    name: normalizedData[lang][dimension][key].name,
                    description: normalizedData[lang][dimension][key].description,
                    id: normalizedData[lang][dimension][key].id,
                    constructIndexes: shallowCopy(normalizedData[lang][dimension][key].constructIndexes)
                }
            }
        }

        if(dimension == 'constructs'){
            for (var key in normalizedData[lang][dimension]){
                copy[dimension][key] = {        
                    name: normalizedData[lang][dimension][key].name,
                    description: normalizedData[lang][dimension][key].description,
                    id: normalizedData[lang][dimension][key].id,
                    groupId: normalizedData[lang][dimension][key].groupId,
                    groupName: normalizedData[lang][dimension][key].groupName,
                    groupDesc: normalizedData[lang][dimension][key].groupDesc,
                    isFirstEntry: normalizedData[lang][dimension][key].isFirstEntry,
                    groupIndex: normalizedData[lang][dimension][key].groupIndex,
                    featureIndexes: shallowCopy(normalizedData[lang][dimension][key].featureIndexes)   
                }
            }
        }

        if(dimension == 'features'){
            copy[dimension][key] =  {
                name: normalizedData[lang][dimension][key].name,
                description: normalizedData[lang][dimension][key].description,
                id: normalizedData[lang][dimension][key].id,
                upperBound: normalizedData[lang][dimension][key].upperBound,
                lastFeature: normalizedData[lang][dimension][key].lastFeature,
                groupId: normalizedData[lang][dimension][key].groupId,
                groupName: normalizedData[lang][dimension][key].name,
                groupIndex: normalizedData[lang][dimension][key].groupIndex,
                constructIndex: normalizedData[lang][dimension][key].constructIndex,
                testIndexes : normalizedData[lang][dimension][key].testIndexes 
            }
        }

    }
    return copy;
}


    
 function copyEngines(engines){
    var copy = [];
    for (var index in engines){
        var idParts = engines[index].id.split('__');
        var versionLong = engines[index].version;
        if(idParts.length > 2){
            versionLong = engines[index].version+' '+idParts[2];
        }
        copy[index] = {
            configuration: shallowCopy(engines[index].configuration),
            id: engines[index].id,
            language: engines[index].language,
            name: engines[index].name,
            version: engines[index].version,
            url: engines[index].url,
            license: engines[index].license,
            licenseURL: engines[index].licenseURL,
            releaseDate: engines[index].releaseDate,
            programmingLanguage: engines[index].programmingLanguage,
            versionLong: versionLong,
            indexEngine: index
        }
    }
    return copy;
 }

  function shallowCopy(array){
    var copy = [];
    for (var index in array) {
        copy[index] = array[index];
    }
    return copy;
  }