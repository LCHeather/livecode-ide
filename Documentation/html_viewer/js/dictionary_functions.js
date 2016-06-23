	var tState = {selected:"",history:{list:[],selected:-1},searched:{},filters:{},filtered_data:[],data:"",selected_api_id:""};
	
	if($.session.get("selected_api_id")) tState.selected = $.session.get("selected_api_id");
	
	if($.session.get("selected")) tState.selected = $.session.get("selected");
	else tState.selected = 1;

	
	function dataGet(){
		//console.log(dictionary_data.docs);
		
		if(!dictionary_data.docs.hasOwnProperty(tState.selected_api_id)){
			
			$.each(dictionary_data.docs, function(index, libraryData){
				tState.selected_api_id = index;
				return false;
			});
		}
		
		if(tState.dirtyData == true || tState.data == ""){
			tState.data = dictionary_data.docs[tState.selected_api_id].doc.sort(compareEntryObject);
			tState.dirtyData = false;
		}
		
		return tState.data;
	}
	
	// Return all the syntax associated with an entry
	// as a (matchable) string
	function collectSyntax(pEntry)
	{
		var tSyntax = '';
		$.each(pEntry["display syntax"], function (index, value) 
		{
			if (tSyntax != '')
				tSyntax += ' ';
				
			tSyntax += value;
		});
		return tSyntax;
	}
	
	// Return a list of matched search terms
	function dataSearch(pTerm)
	{
		// Check the cached search data
		if (tState.searched.hasOwnProperty("term") && tState.searched.term == pTerm) 
			return tState.searched.data;
			
		tState.searched.term = pTerm;
		tState.searched.data = [];
		
		// Get a list of space-delimited search terms				
   		var tokensOfTerm = pTerm.match(/\S+/g);
		
		
		// Generate two regexes - one that matches all syntax that 
		// contains each search term, and one that matches all syntax that
		// contains a word beginning with each search term. This way we 
		// can prioritise matches that start with the search terms.
    	var matchExp = '';
    	var priorityMatch = '';
    	$.each(tokensOfTerm, function(index, matchToken)
    	{
       		matchExp += '(?=.*' + matchToken + ')';
       		priorityMatch += '(?=.*\\b' + matchToken + ')';
   		});

		var regex = new RegExp(matchExp, "i");
		var priorityRegex = new RegExp(priorityMatch, "i");
		
		// Grep for the general search term
		tState . searched . data = $.grep(tState.filtered_data, function (e) 
		{
			var tToMatch = collectSyntax(e);
			var tMatched = regex.test(tToMatch);
			return tMatched;
		});

		// Sort the priority matches to the top
		tState . searched . data . sort(function(a, b) 
		{
			var tToMatch = collectSyntax(a);		
			if (priorityRegex.test(tToMatch))
				return -1;
			
			tToMatch = collectSyntax(b);
			if (priorityRegex.test(tToMatch))
				return 1;
				
			return 0;
		});
	
		return tState . searched . data;
	}
	
	function dataFilter(){
		var filtered_data = [];
		var tFound_data = []
		
		if(jQuery.isEmptyObject(tState.filters) == true){
		 	tState.filtered_data = dataGet();
		} else {		
			$.each(dataGet(), function(index, entryData){
				$.each(tState.filters, function(category, values){
					tFound_data[category] = 0;
					$.each(values, function(tag, tag_value){
					
						switch(category){
							case "type":
								if(entryData[category] == tag_value){
									tFound_data[category]++;
								 }
								break;
							case "platforms":
							case "OS":
							case "tags":
								if(entryData.hasOwnProperty(category)){
									$.each(entryData[category], function(item_index, entry_item_value){
										if(tag_value == entry_item_value){
											tFound_data[category]++;
										}
									});
								}
								break;
						}
					});
				});
			
				var tMatch = true;
				$.each(tState.filters, function(category, values){
					if(tFound_data[category] == 0){
						tMatch = false;
					}
				});
			
				if(tMatch == true) filtered_data.push(entryData);
			});
			
			tState.filtered_data = filtered_data;
		}
		displayFilters();
		
		tState.searched = {};
		displayEntryListGrep($("#ui_filer").val());	
	}
	
	function compareEntryObject(entryObject1,entryObject2) {
		if(entryObject1["display syntax"][0].toLowerCase() < entryObject2["display syntax"][0].toLowerCase())
			return -1;
		if (entryObject1["display syntax"][0].toLowerCase() > entryObject2["display syntax"][0].toLowerCase())
			return 1;
		return 0;
	}


	function filterOptions(pCategories){
		var tFilterOptionWithCount = {}
		var tShowCatogories = pCategories.split(',');
		$.each(tShowCatogories, function( index, category_name) {
			tFilterOptionWithCount[category_name] = {}
		});
		
		$.each(tState.filtered_data, function( entry_index, entry_data) {
			$.each(tShowCatogories, function( category_index, category_name) {
				// If the category is already being filtered on then don't count
				if(!tState.filters.hasOwnProperty(category_name)){
					if(entry_data[category_name]){
						var tTagData = entry_data[category_name];
		
						if(Array.isArray(tTagData)){
							// Data is an array meaning there are multiple values. I.e. multiple tags / platforms to check.
							$.each(tTagData, function( tag, tag_value) {
								if(tFilterOptionWithCount[category_name].hasOwnProperty(tag_value)){
									tFilterOptionWithCount[category_name][tag_value]++;
								} else {
									tFilterOptionWithCount[category_name][tag_value] = 1;
								}
							});
						} else {
							if(tFilterOptionWithCount[category_name].hasOwnProperty(tTagData)){
								tFilterOptionWithCount[category_name][tTagData]++;
							} else {
								tFilterOptionWithCount[category_name][tTagData] = 1;
							}
						}
					}
				}
			});
		});
		return tFilterOptionWithCount;
	}
	
	function filter_remove(pTag,pData){
		if(tState.filters.hasOwnProperty(pTag)){
			$.each(tState.filters[pTag], function(index, data) {
				if(data==pData){
					tState.filters[pTag].splice(index, 1)
					if(tState.filters[pTag].length == 0){
						delete tState.filters[pTag];
					}
					return false;
				}
			});
		}
		dataFilter();
	}
	
	function filter_add(pTag,pData){
		if(!tState.filters.hasOwnProperty(pTag)) tState.filters[pTag] = [];
		
		if(tState.filters[pTag].indexOf(pData) == -1){
			tState.filters[pTag].push(pData);
			dataFilter();
		}
	}
	
	function sortedKeys(obj)
	{
		return Object.keys(obj).sort();
	}
	
	function displayFilters(){
		// First display the applied filters
		var tHTML = "";
		$.each(tState.filters, function(filter_tag, filter_data) {
			tHTML += '<div style="margin-bottom:10px">';
			tHTML += '<b>'+filter_tag+':</b> ';
			$.each(filter_data, function(index, filter_name) {
				tHTML += '<button type="button" class="btn btn-default btn-sm remove_filter" filter_tag="'+filter_tag+'" filter_data="'+filter_name+'">'+filter_name+'</button>';
			});
			tHTML += '</div>';
		});
		$("#filters").html(tHTML);
		
		// Next display the filter options
		tHTML = "";
		var tFilterData = filterOptions("type,tags,OS");
		
		$.each(tFilterData, function(category, value) {
			if(jQuery.isEmptyObject(value) == false){
				tHTML += '<div style="margin-bottom:20px">';
				tHTML += '<b>'+category+':</b> ';
				
				var tSortedFilters = sortedKeys(value);
				for (index = 0; index < tSortedFilters.length; ++index)
				{
					var tFilter = tSortedFilters[index];
					if(tState.filters.hasOwnProperty(index) && tState.filters[category].indexOf(tFilter) > 0){
				
					} else {
						tHTML += '<a href="#" class="apply_filter" filter_category="'+category+'" filter_value="'+tFilter+'">'+tFilter+' <span class="badge">'+value[tFilter]+'</span></a> ';
					}
				}
				tHTML += '</div>';
			}
		});
	
		$("#filters_options").html(tHTML);
	}
	
	function displayEntryListGrep(pTerm){
		var start = new Date().getTime();
		var tHTML = "";
		var resultSet = "";
		
		if(pTerm){
			resultSet = dataSearch(pTerm);
			
			var x = 1;
			$.each(resultSet, function( index, value) {
				//if(x > 100) return false;
				x++;
				
				if(tState.selected == value.id) tClass = " active";
				else tClass = "";
				tHTML += '<tr class="entry_list_item load_entry'+tClass+'" entryid="'+value["id"]+'" id="entry_list_item_'+value["id"]+'">';
				if(value.hasOwnProperty("display syntax") && value["display syntax"][0] != value["display name"]){
					tHTML += '<td>'+value["display syntax"][0]+'</td>';
				} else {
					tHTML += '<td>'+value["display name"]+'</td>';
				}
				tHTML += '</tr>';
				
			});
		} else {
			resultSet = tState.filtered_data;
			var x = 1;
			$.each(resultSet, function( index, value) {
				//if(x > 100) return false;
				x++;
				
				if(tState.selected == value.id) tClass = " active";
				else tClass = "";
				tHTML += '<tr class="entry_list_item load_entry'+tClass+'" entryid="'+value["id"]+'" id="entry_list_item_'+value["id"]+'">';
				if(value.hasOwnProperty("display syntax") && value["display syntax"][0] != value["display name"]){
					tHTML += '<td>'+value["display syntax"][0]+'</td>';
				} else {
					tHTML += '<td>'+value["display name"]+'</td>';
				}
				tHTML += '</tr>';
				
			});
		}
		
		$("#list").html(tHTML);
		$("#entries_showing").html(resultSet.length);
		$("#entries_total").html(dataGet().length);
	}
	
	function displayLibraryChooser(){
		var tHTML = ""
		$.each(dictionary_data.docs, function(index, libraryData){
			if(index == tState.selected_api_id) tHTML += '<li role="presentation"><a role="menuitem" tabindex="-1" href="#" library_id="'+index+'" class="active">'+libraryData["display name"]+'</a></li>';
			else tHTML += '<li role="presentation"><a role="menuitem" tabindex="-1" href="#" library_id="'+index+'">'+libraryData["display name"]+'</a></li>';
		});
	
		$("#lcdoc_library_chooser_list").html(tHTML);
	}
	
	function formatMarkdown(pEntryObject, pContent)
	{
		var tMarkdown = pContent;
		if(pEntryObject.parameters){
			$.each(pEntryObject.parameters, function(index, value) {
				tMarkdown = tMarkdown.replace('<'+value.name+'>', '*'+value.name+'*');	
			});
		}

		if(pEntryObject.synonyms){
			$.each(pEntryObject.synonyms, function(index, value) {
				tMarkdown = tMarkdown.replace('<'+value+'>', '*'+value+'*');	
			});
		}
	
		tMarkdown = replace_link_placeholders_with_links(tMarkdown,pEntryObject);
		
		var renderer = new marked.Renderer();
		renderer.table = function(header, body) 
		{
			var tTable;
			tTable = '<div class="table-responsive"><table class="table table-bordered">\n';
			tTable += '<thead>' + header + '</thead>\n';
			tTable += '<tbody>' + body + '</tbody>\n';
			tTable += '</table></div>';
			
			return tTable;
		}
		
		return marked(tMarkdown, { renderer: renderer });
	}
	
	function displayEntry(pEntryID)
	{		
		var tEntryObject = entryData(pEntryID);
		history_add(tEntryObject);
		
		pEntryID = tEntryObject.id;
		
		console.log(tEntryObject);
		
		if(tState.selected == pEntryID) return 1;
		tState.selected = pEntryID;
		$.session.set("selected", pEntryID);
		
		breadcrumb_draw();
		
		$(".entry_list_item").removeClass("active");
		$("#entry_list_item_"+pEntryID).addClass("active");
		selectedEntryEnsureInView(tEntryObject.id);
		
		var tHTML = "";
		var references = [];
		tHTML += '<h1 style="margin:0px 0px 30px 12px">'+tEntryObject["display name"]+'</h1><div class="row">';
		$.each(tEntryObject, function(index, value) {
			if(index == "id" || index == "name") return;
			
			switch(index){
				case "examples":
					tHTML += '<div class="col-md-2 lcdoc_section_title">'+index+'</div><div class="col-md-10" style="margin-bottom:10px">';	
					if($.isArray(value)){
						$.each(value, function(index2, value2) {
							tHTML += '<pre><code>' + value2.script + '</code></pre>';
						});
					} else {
						tHTML += 'Malformed examples in JSON';	
					}
					tHTML += '</div>';	
					break;
				case "parameters":
				case "value":
					if($.isArray(value)){
						
						tHTML += '<div class="col-md-2 lcdoc_section_title">'+index+'</div><div class="col-md-10" style="margin-bottom:10px">';
						tHTML += '<div class="table-responsive"><table class="table table-bordered">';
						tHTML += '<thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead><tbody>';
						$.each(value, function(index2, value2) {
							switch(value2.type){
								case "array":
									value2.description = replace_link_placeholders_with_links(value2.description, tEntryObject);
									tHTML += '<tr><td class="lcdoc_entry_param">'+value2.name+'</td><td>'+value2.type+'</td><td>'+parameterFormatValue("array", value2)+'</td></tr>';
									break;
								case "enum":
									value2.description = replace_link_placeholders_with_links(value2.description, tEntryObject);
									tHTML += '<tr><td class="lcdoc_entry_param">'+value2.name+'</td><td>'+value2.type+'</td><td>'+parameterFormatValue("enum", value2)+'</td></tr>';
									break;
								default:
									tHTML += '<tr><td class="lcdoc_entry_param">'+value2.name+'</td>';
									tHTML += '<td>'+replace_link_placeholders_with_links(value2.type,tEntryObject)+'</td>';
									tHTML += '<td><div class="lcdoc_description">'+ formatMarkdown(tEntryObject, value2.description)+'</div></td></tr>';
									break;
							}
						});
						tHTML += '</tbody></table></div>';
						tHTML += '</div>';
					} else {
						tHTML += 'Malformed parameters in JSON';	
					}
					
					break;
				case "references":
					tHTML += '<div class="col-md-2 lcdoc_section_title">Related</div><div class="col-md-10" style="margin-bottom:10px">';
					
					$.each(value, function(reference_type, reference_array) {
						tHTML += reference_type + ':';
						var reference_html = "";
						$.each(reference_array, function(reference_index, reference_name) {
							if(reference_html == "") reference_html = ' <a href="javascript:void(0)" class="load_entry" entryid="'+entryNameToID(reference_name,reference_type)+'">'+reference_name+'</a>';
							else reference_html += ', <a href="javascript:void(0)" class="load_entry" entryid="'+entryNameToID(reference_name,reference_type)+'">'+reference_name+'</a>';
						});
						tHTML += reference_html;
						tHTML += '<br />';
					});
				
					tHTML += '</div>';
				
					break;
				case "syntax":
					var tSyntaxHTML = "";
					tHTML += '<div class="col-md-2 lcdoc_section_title">'+index+'</div><div class="col-md-10" style="margin-bottom:10px">';	
					if($.isArray(value)){
						$.each(value, function(index2, value2) {
							tSyntaxHTML += replace_link_placeholders_with_param(value2);
							// Syntax can be multi-line
							tSyntaxHTML = tSyntaxHTML.replace(/\n/g, "<br />")
							tSyntaxHTML += '<br />';
						});
					} else {
						tSyntaxHTML += 'Malformed syntax in JSON';	
					}
					tHTML += tSyntaxHTML;
					tHTML += '</div>';
					break;
				case "associations":
					if($.isArray(value)){
						tHTML += '<div class="col-md-2 lcdoc_section_title">'+index+'</div><div class="col-md-10" style="margin-bottom:10px">';
						var association_html = "";
						$.each(value, function(index2, value2) {
							var tIndex = entryNameToID(value2,"object");
							if(tIndex == 0) tIndex = entryNameToID(value2,"library");
							if(tIndex == 0) tIndex = entryNameToID(value2,"glossary");
							if(association_html == 0) association_html = '<a href="javascript:void(0)" class="load_entry" entryid="'+tIndex+'">'+value2+'</a>';
							else association_html += ', <a href="javascript:void(0)" class="load_entry" entryid="'+tIndex+'">'+value2+'</a>';
						});
						tHTML += association_html+'</div>';
					}
					break;
				case "summary":
					tHTML += '<div class="col-md-2 lcdoc_section_title">'+index+'</div><div class="col-md-10" style="margin-bottom:10px">';
					//tHTML += '<span class="social social-ios"></span>';
					tHTML += replace_link_placeholders_with_links(value,tEntryObject);
					tHTML += '</div>';
					break;	
				case "description":
				case "security":
				case "tags":
				case "display name":
				case "display syntax":
					break;
					
				
					
				default:
					
					tHTML += '<div class="col-md-2 lcdoc_section_title">'+index+'</div><div class="col-md-10" style="margin-bottom:10px">';
					//tHTML += '<span class="social social-ios"></span>';
					tHTML += value;
					tHTML += '</div>';
					break;
			}
		});
		
		
		if(tEntryObject.description){
			// Italicise any parameters
			tHTML += '<div class="col-md-2 lcdoc_section_title">description</div><div class="col-md-10 lcdoc_description" style="margin-bottom:10px">';
			tHTML += formatMarkdown(tEntryObject, tEntryObject.description);
			tHTML += '</div>';
		}

		// Now that the entry has been displayed we need to look at the type
		// If it is object, we need to generate a list of actions / events and properties
		// That can be set on the object. The entry if you like should be a pointer to 
		// Everything associated with the object. A cross between a overview and userguide
		
		if(tEntryObject.type == "object" || tEntryObject.type == "widget" || tEntryObject.type == "library"){
			var object_name = tEntryObject["display name"].toLowerCase();
			var object_data = {};
			
			$.each(dataGet(),function(entry_index, entry_data){
				if(entry_data.hasOwnProperty("associations")){
					if(entry_data["associations"].indexOf(object_name) >= 0){
						if(!object_data.hasOwnProperty(entry_data.type)){
							object_data[entry_data.type] = [];
						}
						object_data[entry_data.type].push(entry_data);
					}
				}
			});
			
			$.each(object_data,function(item_type, item_data){
				tHTML += '<div class="col-md-2 lcdoc_section_title">'+item_type+'</div><div class="col-md-10" style="margin-bottom:10px">';
				tHTML += '<table class="lcdoc_glossary_table">';
				tHTML += '<thead><tr><td><b>Name</b></td><td><b>Summary</b></td><td><b>Syntax</b></td></tr></thead><tbody>';
				$.each(item_data,function(item_intex, entry_data){
					tHTML += '<tr>';
					tHTML += '<td><a href="javascript:void(0)" class="load_entry" entryid="'+entry_data.id+'">'+entry_data["display name"]+'</a></td>';
					tHTML += '<td>'+replace_link_placeholders_with_param(entry_data.summary)+'</td>';
					tHTML += '<td>'+replace_link_placeholders_with_param(entry_data.syntax[0])+'</td>';
					tHTML += '</tr>';
				});
				tHTML += '</tbody></table>';
				tHTML += '</div>';
			});
			//console.log(object_data);
		}
		
		tHTML += '</div>';
		
		$("#api_entry").html(tHTML);
		$('pre code').each(function(i, block) {
    		hljs.highlightBlock(block);
 		});		
 		
 		// Force code not detected as LCB to be highlighted as LCS
 		$(".hljs:not(.livecodebuilder)").each(function(i, block) {
 			$(this).addClass("livecode");
    		hljs.highlightBlock(block);
 		});
		window.scrollTo(0, 0);
	}
	
	function replace_link_placeholders_with_param(pText){
		if(pText){
			var pText = pText.replace(/<([^>]*)>/igm, function(matched_whole, matched_text) {
				var resolved = resolve_link_placeholder(matched_text);
				return '<span class="lcdoc_entry_param">' + resolved[0] + '</span>';	
			});
			return pText;
		}
	}	
				
	
	function replace_link_placeholders_with_links(pText, pEntryObject){
		if(pText && pEntryObject){
			var pText = pText.replace(/<([^>]*)>/igm, function(matched_whole, matched_text) {
				var return_text = matched_whole;
				
				if(pEntryObject.hasOwnProperty("display name")) {
					if(pEntryObject["display name"] != "" && matched_text == pEntryObject["display name"]){
						return_text =  '<span class="lcdoc_entry_name">' + pEntryObject["display name"] + '</span>';
					}
				}
				
				if(pEntryObject.hasOwnProperty("synonyms")) {
					$.each(pEntryObject.synonyms, function( index, value) {
						if (value == matched_text)
						 	return_text =  '<span class="lcdoc_entry_name">' + matched_text + '</span>';
				 	});
				} 
				
				if(pEntryObject.hasOwnProperty("parameters")) {
					$.each(pEntryObject.parameters, function(index, parameter_object) {
						if(parameter_object.name == matched_text){
							return_text = '<span class="lcdoc_entry_param">' + parameter_object.name + '</span>';
						} 
					});
             	}
             	
             	if(return_text == matched_whole){
             		var resolved = resolve_link_placeholder(matched_text);
             		
             		var entry_id = resolve_link(pEntryObject, resolved[1], resolved[2]);
             		
             		if (entry_id)
             	   		return_text = '<a href="javascript:void(0)" class="load_entry" entryid="'+entry_id+'">' + resolved[0] + '</a>';
             		else
             			return_text = resolved[0];
             	}
             	
             	
				if(return_text == matched_text){
					return matched_whole;
                }
             	return return_text;
         	});
		}
		return pText;
	}
	
	// Returns an array with the label, the reference name and optional reference type.
	function resolve_link_placeholder(pText) {
		var return_array = new Array();
		var matched_text = pText.split("|");	
             		
        if (matched_text[1])
        	return_array[0] = matched_text[1]
                      		
        // Find the entry ID for the given string
        var regex = /([^\(]*)(?:\((.*)\))?/;

		var result = regex.exec(matched_text[0]);
		
		if (!matched_text[1])
			return_array[0] = result[1];
		
		return_array[1] = result[1];
        return_array[2] = result[2];
     	return return_array;   
	}
	
	
	// Return an entry ID from the target name and optional type
	function resolve_link(pEntryObject, pTargetName, pTargetType) {
        var entry_id;
        if(pTargetType){
	        // Know name and type so lookup id
             entry_id = entryNameToID(pTargetName,pTargetType);
        } else {
        	// Work out the type from the reference
			if(pEntryObject.hasOwnProperty("references")) {
				$.each(pEntryObject.references,  function(reference_type, reference_array) {
					$.each(reference_array, function(reference_index, reference_name) {
						if (reference_name == pTargetName)
						{
							entry_id = entryNameToID(reference_name,reference_type);
							return;
						}
					});
					// Just find the first one if no type was specified.
					if (entry_id)
						return;
				});
			}
        }
	        
	    return entry_id;
	}
	
	function entryData(pEntryID){
		var tData = {};
	
		$.each(dataGet(), function(index, value) {
			if(value.id == pEntryID){
				tData = value;
				return false;
			}
			
		});
		
		return tData;
	}
	
	function entryNameToID(pName,pType){
		var tID = 0;
	
		$.each(dataGet(), function( index, value) {
			if((value.name == pName || value["display name"] == pName) && value.type == pType){
				tID = value.id;
				return false;
			}
			
		});
		return tID;
	}
	
	function entryIDToArrayKey(pID){
		var tID = 0;
		$.each(dataGet(), function( index, value) {
			if(value.id == pID){
				tID = index;
				return false;
			}
			
		});
		return tID;
	} 
	
	function breadcrumb_draw()
	{
		var tHistory = tState.history.list;
				
		var tHtml = '';
		if (tHistory . length > 1)
			tHtml += '<li class="dropdown">';
		else
			tHtml += '<li class="disabled">';
		
		tHtml += '<a href="#" class="dropdown-toggle" data-toggle="dropdown">';
		tHtml += '<span class="glyphicon glyphicon-time" id="dropdownMenu2" aria-expanded="true"></span>';
		tHtml += '<ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu2" id="lcdoc_history_list">';
		
		$.each(tHistory, function(index, value) 
		{
			if (index == tState.history.selected)
				tHtml += '<li class="active"><a href="#">'+tHistory[index].name+'</a></li>';
			else
				tHtml += '<li><a href="javascript:void(0)" class="load_breadcrumb_entry" historyIndex ="'+index+'">'+value.name+'</a></li>';
		});

		tHtml += '</ul>';
		tHtml += '</a></li>';
		
		var tGlyphPrefix, tGlyphSuffix;
		tGlyphPrefix = '<a href="#"><span aria-hidden="true" class="glyphicon glyphicon-chevron-';
		tGlyphSuffix = '"></span>';

		var tAltPrefix, tAltSuffix;		
		tAltPrefix = '<span class="sr-only">';
		tAltSuffix = '</span></a>';
		
		var tLeftNavHtml, tRightNavHtml;
		tLeftNavHtml =  tGlyphPrefix + 'left' + tGlyphSuffix + tAltPrefix + 'Previous' + tAltSuffix;
		tRightNavHtml = tGlyphPrefix + 'right' + tGlyphSuffix + tAltPrefix + 'Next' + tAltSuffix;		

		var tLeftNavItem;
		if (tState.history.selected > 0) 
			tLeftNavItem = '<li class="lcdoc_history_back">' + tLeftNavHtml;
		else 
			tLeftNavItem = '<li class="disabled" style="float:left">' + tLeftNavHtml;
		
		tLeftNavItem += '</li>';
		
		if (tState.history.selected < tHistory.length - 1) 
			tRightNavItem = '<li class="lcdoc_history_forward">' + tRightNavHtml;
		else 
			tRightNavItem = '<li class="disabled">' + tRightNavHtml;

		tRightNavItem += '</li>';
	
		$("#breadcrumb").html(tLeftNavItem + tRightNavItem + tHtml);
	}
	
	function parameterFormatValue(pType, pData){
		var tHTML = "";
		tHTML += "<p>" + pData.description + "</p>";
		
		switch(pType){
			case "enum":
				if(pData.hasOwnProperty("enum")){
				   tHTML += "<p>One of the following items:</p><ul>";
				   $.each(pData.enum, function(index, value) {
					   tHTML += '<li><span class="lcdoc_parameterValue">' + value.value + '</span> - ' + value.description + '</li>';
				   });
				   tHTML += "</ul>";
				}
				break;
			case "array":
				if(pData.hasOwnProperty("description")){
					tHTML += "<p>"+pData.description+"</p>";
				}
				break;
		}

		return tHTML;
	}
	
	function history_selected_entry()
	{
		return tState.history.list[tState.history.selected];
	}
	
	function history_add(pEntryObject)
	{	
		if (tState.history.selected != -1)
		{
			// If this is the currently selected item, don't do anything
			if (history_selected_entry().id == pEntryObject.id)
				return;
		}

		var tObject = {"id":pEntryObject.id,"name":pEntryObject["display name"]}
		var tNewHistory = tState . history .list;
		
		// Remove item from history if it is present
		$.each(tNewHistory, function(index, value) 
		{
			if (value.id == tObject.id)
			{
				tNewHistory.splice(index, 1);
				return;
			}
		});
		
		// Push item onto end of history list
		tNewHistory.push(tObject);
		
		tState.history.list = tNewHistory;
		tState.history.selected = tNewHistory . length - 1;
	}
	
	function history_back()
	{
		go_history(tState.history.selected - 1);
	}
	
	function history_forward()
	{
		go_history(tState.history.selected + 1);
	}
	
	function go_history(pHistoryID)
	{
		tState.history.selected = pHistoryID
		displayEntry(history_selected_entry().id);
	}
	
	function entry_next(){
		var tSelectedID = tState.selected;
		var tNextID = tSelectedID;
		
		$.each(tState.filtered_data, function( index, value) {
			if(value.id == tSelectedID){
				if(tState.filtered_data[index+1]){
					tNextID = tState.filtered_data[index+1].id;
				}
			}
			
		});
		displayEntry(tNextID);
	}
	
	function library_set(pLibraryID){
		var tLibraryName = library_id_to_name(pLibraryID);
		$("#lcdoc_library_chooser_text").html(tLibraryName);
	
		if(dictionary_data.docs.hasOwnProperty(pLibraryID))
		{				
			if (tState.selected_api_id != pLibraryID)
			{
				tState.selected_api_id = pLibraryID;
				$.session.set("selected_api_id", pLibraryID);
				tState.selected = ""
				tState.history = {list:[], selected:-1};
				tState.searched = {};
				tState.filters= {};
				tState.filtered_data = [];
				tState.data = "";
			
				dataFilter();
				displayEntry(1);
			}
		}
	}
	
	function library_id_to_name(pID){
		if(dictionary_data.docs.hasOwnProperty(pID)){
			return dictionary_data.docs[pID]["display name"];
		}
	}
	
	function library_name_to_id(pName){	
		var tID = 0;
		$.each(dictionary_data.docs, function(index, value) {
			if((value.name == pName || value["display name"] == pName)){
				tID = index;
				return false;
			}
			
		});
		return tID;
	}
	
	function entry_previous(){
		var tSelectedID = tState.selected;
		var tPreviousID = tSelectedID;
		
		$.each(tState.filtered_data, function( index, value) {
			if(value.id == tSelectedID){
				if(index > 0){
					tPreviousID = tState.filtered_data[index-1].id;
				}
			}
			
		});
		displayEntry(tPreviousID);
	}
	
	function selectedEntryEnsureInView(tEntryID)
	{
		var listTop = $("#list").offset().top;
		var listBottom = $("#list").offset().top + $("#list").height();
		
		if($("#entry_list_item_" + tEntryID).length){
			//var elementTop = $("#entry_list_item_" + tEntryID).offset().top;
			//var elementBottom = $("#entry_list_item_" + tEntryID).offset().top + $("#entry_list_item_" + tEntryID).height();
		
			//if(elementBottom > listBottom) $("#list").scrollTop($("#entry_list_item_" + tEntryID));
			//if(elementTop < listTop) $("#list").scrollTop($("#entry_list_item_" + tEntryID));
		}
	} 
	
	function goEntryName(pLibraryName, pEntryName, pEntryType)
	{
		var tLibraryID = library_name_to_id(pLibraryName);
		library_set(tLibraryID);
		
		var tID = entryNameToID(pEntryName, pEntryType);
		if (tID == 0)
			tID = 1;
		displayEntry(tID);
	}
	
	function setActions()
	{	
		breadcrumb_draw();
	
		$('#ui_filer').keyup(function() {
		  displayEntryListGrep(this.value);
		})
		
		$("body").on( "click", ".load_entry", function() {
			var tEntryID = $(this).attr("entryid");
			displayEntry(tEntryID);
		});
		
		$("body").on( "click", ".load_breadcrumb_entry", function() {
			var tHistoryIndex;
			tHistoryIndex = parseInt($(this).attr("historyIndex"));
			go_history(tHistoryIndex);
		});
		
		$("body").on( "click", ".apply_filter", function() {
			var filter_tag = $(this).attr("filter_category");
			var filter_data = $(this).attr("filter_value");
			filter_add(filter_tag,filter_data);
		});
		
		$("body").on( "click", ".remove_filter", function() {
			var filter_tag = $(this).attr("filter_tag");
			var filter_data = $(this).attr("filter_data");
			filter_remove(filter_tag,filter_data);
		});

		$("body").on( "click", ".lcdoc_history_forward", function() {
			history_forward();
		});
		
		$("body").on( "click", ".lcdoc_history_back", function() {
			history_back();
		});
		
		$("body").on( "click", "#table_list", function() {
			$(this).addClass("table_focused");
		});
		
		$(window).on( "click", function(e) {
			if(e.pageX > $("#table_list").offset().left && e.pageX < ($("#table_list").offset().left + $("#table_list").width()) && e.pageY > $("#table_list").offset().top && e.pageY < ($("#table_list").offset().top + $("#table_list").height())) return false;
			$("#table_list").removeClass("table_focused");
		});
		
		$("#lcdoc_library_chooser_list").on( "click", "a", function() {
			var library_id = $(this).attr("library_id");
			var library_name = library_id_to_name(library_id);
			library_set(library_id);
		});
		
		$("#lcdoc_list").bind('mousewheel', function(e, d)  {
			var t = $("#list");
			if (d > 0 && t.scrollTop() === 0) {
				e.preventDefault();
			}
			else {
				if (d < 0 && (t.scrollTop() == t.get(0).scrollHeight - t.innerHeight())) {
					e.preventDefault();
				}
			}
		});
		
		$(document).keydown(function(e) {
		   switch(e.which) {
			   case 37: // left
					if(!$("#ui_filer").is(":focus")){
						history_back();
						e.preventDefault();
					}
					break;

			   case 38: // up
			   		if($("#table_list").hasClass("table_focused")){
			   			entry_previous();
			   			e.preventDefault();
			   		}
			   		break;

			   case 39: // right
					if(!$("#ui_filer").is(":focus")){
						history_forward();
						e.preventDefault();
					}
					break;

			   case 40: // down
			   		if($("#table_list").hasClass("table_focused")){
			   			entry_next();
			   			e.preventDefault();
			   		}
			   		break;

			   default: return; // exit this handler for other keys
		   }
		   
		});
	}
