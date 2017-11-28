//morph-parse.js

// todo
//.  create branching at prefix level if two match 
//		need to try all prefixes: tion, ion zB nation
// how to match pos non-terminals to rules below: verb_verb_suffix_tense to only participle or past tense verbs 
// 		tense and conj are pos/syntaxtic attributes
// 		!interesting: a nested layer in morphology: words, syntax attribs(tense,conjug),word morphology(level 1: compounds, level 2: suffixes,prefixes; then nesting)
// done: has extra node: rate unknown stem last/lower


function tabs(depth) {
	let res=""
	for (let i=0; i<depth; i++)
		res+="  "
	return res
}

function treeToStringPretty(node) {
	return treeToString(node, true)	
}
function treeToString(node, pretty, depth=0) {
	if (!node) return "";
	depth++
	return (pretty?"\n"+tabs(depth):"") + " ( "+node.symbol+" : "+ 
	(node.children?
		(  node.children.reduce((string, child)=>string+=treeToString(child, pretty, depth) , "") )
		+(pretty?"\n"+tabs(depth):"") 
		: 
		node.string
	)
	 +" ) " 
}


function rateTree(node) {
	if (!node) return 0;
	let ret = 1+ 
	(node.children?
		node.children.reduce((rating, child)=>{ 
			return rating+=rateTree(child) 
		}, 0) 
		: 
		0
	)
	return ret
}

// rating trees:
// 	number of known stems, number of rules
// 	does it match proposed goal 
// 	length of terminal?? 


function createNode(symbol, string) {
    let node = { symbol: symbol , string : string }
    return node;
}

function cloneNode(node) {
    let newnode = { symbol: node.symbol , string : node.string }
    return newnode;
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
    	return []
    let products=[];
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
	            products.push(defineProduct( nonterminal, string))
	    } else {
            //let {index, subindex, rest}
            let itemIndexes = searchRule(rule, string, affixType)
            itemIndexes.forEach( itemIndex => {
            	let var_ruleName = ruleName
            	// check for stem variation
            	if (!affixType && itemIndex.subindex)
            		var_ruleName += ":"+rule[itemIndex.index][0]
                products.push( defineProduct(nonterminal, itemIndex.rest, affixType, rule[itemIndex.index][itemIndex.subindex], var_ruleName))
            })
        }
    }
    // =>null,branch-node (contains one child terminal and optional non-terminal child node)
    return products
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
	let res = []
    _.map(rule, (type, ind ) => {
        _.map(type, (item, subind) => {

        	_(getAllIndexes(string,item)).each(indexOf=> {

		        let found=false
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
		            res.push({index:index, subindex:subindex, rest:rest})
		        }
		    })
        })
    })

	return res;
}

function morphParse(start, rules) {
    _.map(rules, (rule, ruleName) => {
        let products = matchRule(start, ruleName, rule)
        products.forEach(product=>{
        	start.children = start.children || []
            start.children.push(product)
            _(product).each(node=> { 
            	morphParse(node, rules)
            })
        })
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
function walkCopies(currentNode, cb, head) {
	if (!head) head=currentNode
	if (currentNode.children) {
		let branches = currentNode.children
		currentNode.children = undefined
		branches.forEach(branch => {
			if (currentNode.children) 
				cb(head)
			currentNode.children=copyBranch(branch) // copy nodes: shallow, copy children point of node, don't clone it
			currentNode.children.forEach(node => {
				walkCopies(node, cb, head)
			})
		})
	}
	if (currentNode==head)
		cb(head)
}

function copyBranch(branch) // copy nodes: shallow, copy children point of node only
{
	let copy=[]
	branch.forEach(node=>{
		let copyNode=cloneNode(node)
		copyNode.children = node.children
		copy.push(copyNode)
	})
	return copy
}
let nonterminals = [ "noun","verb" ,"adj", "adv" ,"prep"  ]
let nonterminalsparse = [ "noun" ]

// prod-nonterm => nonterm (suf/prod)
let rules = {
        noun_verb_suffix: "tion,ion",
    	noun_possive_suffix: "'s",
        noun_plural_suffix: "es,s",
        verb_verb_prefix: "re,inter",
        verb_stem: "nat:nasc,move,be",
        verb_verb_suffix_tense: "ed,d", // these are pos attributes
        verb_verb_suffix_conjugation: "es,s",// these are pos attributes
        verb_adj_suffix: "ize,iza,iz",
        adj_noun_suffix: "al",
        adv_adj_suffix: "ly",
        verb_noun_prefix: "be",
        noun_stem: "house,man,car",
        //unknown_unknownstem: isStemPhonologicallyCorrect,
}

var trees = [] ;

_(nonterminals).each(nonterminal=>{
	let start = createNode(nonterminal, "national")
	let node = morphParse(start, normalizeRules(rules))
	//console.log(JSON.stringify(node,null,2))
	walkCopies(node, (node)=>{
		// console.log(JSON.stringify(node,null,2))
		console.log(node.string, treeToStringPretty(node))
	}) 
})



// function treeToString2(separatedTrees, pretty, depth=0) {
// 	if (!separatedTrees || !separatedTrees.length) return ""
// 	depth++
// 	return (pretty?"\n"+tabs(depth):"") + " ( "+node.symbol+" : "+ 
// 	(node.children?
// 		(  node.children.reduce((string, child)=>string+=treeToString(child, pretty, depth) , "") )
// 		+(pretty?"\n"+tabs(depth):"") 
// 		: 
// 		node.string
// 	)
// 	 +" ) " 
// }
// // ?? still dont get it!!!
// // branch multi by sub branches 
// // branch left and right - product: for left, for right - add tree
// // if one just use, if two , for 
// function extractTrees(branches) {
// 	let trees = []
// 	branches.forEach(branch=>{
// 		let tree=[]
// 		branch.forEach(node=>{
// 		    if (!node.children) {
// 			    tree.push([node])
// 		    }
// 			else {
// 				tree.push(extractTrees(node.children))
// 			}
// 	    })
// 	    if (tree.length==1)
// 	    	trees.push(tree)
// 	    else if (tree.length==2) {
// 	    	tree[0].forEach(left=>{
// 		    	tree[1].forEach(right=>{
// 		    		trees.push([cloneNode(left),cloneNode(right)])
// 		    	})
// 	    	})
// 	    }
// 	    else
// 	    	throw "oops tree length is "+tree.length
// 	})
// 	return trees;
// }

