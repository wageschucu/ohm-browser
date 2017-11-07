//morph-parse.js


function tabs(depth) {
	let res=""
	for (let i=0; i<depth; i++)
		res+="  "
	return res
}
//print all tree children
//	at each branch: dup parent tree rendition and continue
function printTreeStrings(string) {
	console.log(string)
}
function getTreeStrings(node, depth) {
    depth = depth || 0
    let string = ""
    string +=  " ( "+ node.symbol 
    _(node.children).each((branch, branchIndex) => {
		if (node.children.length>1) 
			string +=  "\n"+tabs(depth) 
	    _(branch).each((subnode, index) => {
	        string += getTreeStrings(subnode, depth + 1 )
	    })
    })
	if (!node.children || ! node.children.length) {
	    string += " : "+node.string
	}
	string +=   " ) "
    return string
}

// rating trees:
// 	number of known stems, number of rules
// 	does it match proposed goal 
// 	length of terminal?? 


function createNode(symbol, string) {
    let node = { symbol: symbol , string : string }
    return node;
}

function isTerminal(node) {
    return nonterminals.indexOf(node.symbol)==-1 
}

function isString(node) {
    return node.string !== undefined 
}

function normalizeRules(rules) {
    let newRules = {}
    _.map(rules, (rule, key) => {
    	if (typeof rule == "function") {
    		newRules[key] = rule
    	} else {
	        newRules[key] = rule.split(",")
	        _.map(newRules[key], (subrule, subkey) => {
	            newRules[key][subkey] = subrule.split(":")
	        })
		}
    })
    return newRules;
}

function matchRule(start, ruleName, rule) {
    if (isTerminal(start)) 
    	return
    let product;
    let matched;

    let names = ruleName.split("_")
    let prod = names[0]
    let nonterminal = names[1]
    let affixType = names.length > 2 && names[2]
    let symbol = start.symbol
    let string = start.string 

    if (prod == symbol || "unknown" == prod) {
	    if (typeof rule == "function") {
	        if (rule(start))
	            product = defineProduct( nonterminal, string)
	    } else {
            let {index, subindex, rest} = searchRule(rule, string, affixType)
            if (index !== undefined) {
            	let var_ruleName = ruleName
            	// check for stem variation
            	if (!affixType && subindex)
            		var_ruleName += ":"+rule[index][0]
                product = defineProduct(nonterminal, rest, affixType, rule[index][subindex], var_ruleName)
            }
        }
    }
    // =>null,branch-node (contains one child terminal and optional non-terminal child node)
    return product
}

function defineProduct(nonterminal, rest, affixType, affix,ruleName) {
	let subNodes = [createNode(nonterminal, rest)]
	if (affixType) {
		let newTerminal = createNode(ruleName, affix)
		if (affixType=="prefix")
			subNodes.unshift(newTerminal)
		else 
			subNodes.push(newTerminal)
	}
	return subNodes;
}

function getAllIndexes(string, val) {
    var indexes = [], found=0;
    while ((found=string.indexOf(val, found))!=-1) {
        indexes.push(found);
    	found++
    }
    return indexes;
}

function searchRule(rule, string, affixType) {
	let index, subindex, rest;
	let found
    _.map(rule, (type, ind ) => {
        if (found) return 
        _.map(type, (item, subind) => {
        	if (found) return 

        	_(getAllIndexes(string,item)).each(indexOf=> {

	            let newStem;
	            if (!affixType && indexOf==0 && item.length == string.length)
	            {
	            	newStem=item
	            	found = true
	            }
	            else if (affixType=="prefix" && indexOf==0 && isStringPhonologicallyCorrect(newStem=string.substring(item.length))) {
	            	found = true
	            }
	            else if (affixType=="suffix" && indexOf==(string.length-item.length) && isStringPhonologicallyCorrect(newStem=string.substring(0,indexOf))) {
	            	found = true
	            }
	            if (found) {
		            index=ind;
		            subindex=subind
		            rest = newStem
		        }
		    })
        })
    })

	return {index:index, subindex:subindex, rest:rest};
}

function morphParse(start, rules) {
    _.map(rules, (rule, ruleName) => {
        let products = matchRule(start, ruleName, rule)
        if (products) {
        	start.children = start.children || []
            start.children.push(products)
            _(products).each(product=> { 
            	morphParse(product, rules)
            })
        }
    })
    return start
}

function isStemPhonologicallyCorrect(rule) {
    // c*n+c*
    return isStringPhonologicallyCorrect(rule.string)
}

function isStringPhonologicallyCorrect(string) {
    // c*n+c*
    return string.length > 1 && (true) 
}

let nonterminals = [ "noun","verb" ,"adj", "adv" ,"prep"  ]

// prod-nonterm => nonterm (suf/prod)
let rules = {
        noun_verb_suffix: "tion,ion",
    	noun_possive_suffix: "'s",
        noun_plural_suffix: "es,s",
        verb_verb_prefix: "re,inter",
        verb_stem: "nat:nasc,move,be",
        verb_verb_suffix_tense: "ed,d",
        verb_verb_suffix_conjugation: "es,s",
        verb_adj_suffix: "ize,iza,iz",
        adj_noun_suffix: "al",
        adv_adj_suffix: "ly",
        verb_noun_prefix: "be",
        noun_stem: "house,man,car",
        //unknown_unknownstem: isStemPhonologicallyCorrect,

}

_(nonterminals).each(nonterminal=>{
	let start = createNode(nonterminal, "nationalization")

	let tree = morphParse(start, normalizeRules(rules))
	let treeStrings = getTreeStrings(tree)
	printTreeStrings(treeStrings)
})
