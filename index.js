'use strict'

let got = require('got')

function getTypeDef(obj) {
    let ret_type_def = '';
    if (obj && obj.type) {
        if (["object", "null", "undefined"].indexOf(obj.type) >= 0) {
            return '';
        }
        
        if (["int", "integer", "float"].indexOf(obj.type) >= 0) {
            obj.type = 'number'
        }
        
        if (obj.type === 'Array') {
            obj.type = 'any[]'
        }
         
        if (obj.type === 'function') {
            obj.type  = '() => any'  // this is not correct but we cant know better
        }

        if (obj.type.match(/array\((.*)\)/)) {
            let matches = obj.type.match(/array\((.*)\)/);
            obj.type = matches[1] + '[]'
        }

        let ret_type = obj.type.indexOf("|") === -1 ? obj.type : 'any'; // meh
        ret_type_def = ': ' + ret_type;
    }

    return ret_type_def
}

got('https://openui5.hana.ondemand.com/test-resources/sap/ui/core/designtime/api.json')
    .then((response) => {
        return JSON.parse(response.body)
    })
    .then((api) => {
        let namespaceStack = []
        let classOpen = false;
        function getPadding() {
            return '  '.repeat(namespaceStack.length)
        }
        api.symbols.map(symbol => {
            let name = symbol.name

            while (namespaceStack.length > 0 && !name.startsWith(namespaceStack[namespaceStack.length-1])) {
                namespaceStack.pop()
                console.log(getPadding() + '}')
            }

            let kind = (symbol.kind === 'namespace' && (symbol.methods || symbol.properties))
                 ? (!symbol.methods && symbol.properties) ? 'interface' : 'class' 
                 : symbol.kind
            
            let decl = (namespaceStack.length === 0) ? 'declare ' : ''
            if (symbol.kind === 'namespace' && !symbol.methods && !symbol.properties ) {    
                console.log(getPadding() + decl + 'namespace ' + name + ' {')
                namespaceStack.push(name)
            } else {
                let text = getPadding() + decl + kind + ' ' + symbol.basename
                if(symbol.extends) {
                    text += ' extends ' + symbol.extends
                }
                console.log(text+ ' {')
            }

            symbol.properties && symbol.properties.map(property => {
                let line = property.name + (
                        symbol.kind === 'enum' 
                            ? ','
                            : getTypeDef(property) + ';'
                    )

                console.log(getPadding() + '  ' + line)
            })

            symbol.methods && symbol.methods.map(method => {
                if (method.description) {
                    let comment = method.description.split("\n").map(line => {
                        return getPadding() + '   * ' + line
                    }).join("\n");
                    console.log('')
                    console.log(getPadding() + '  /**')
                    console.log(comment)
                    console.log(getPadding() + '   */' )
                }
                let params = '';
                if (method.parameters) {
                    params = method.parameters.map(pam => {
                        let type_str = getTypeDef(pam);
                        return pam.name + (pam.optional === "true" ? '?' : '') + type_str
                    }).join(', ')
                }
                let ret_type_def = getTypeDef(method)
                let def = method.name + '(' + params + ')' + ret_type_def;
                console.log(getPadding() + '  '  + def + ';')
            })

            if (kind !== 'namespace') {
                console.log(getPadding() + '}')
            }
        })
        while (namespaceStack.length > 0) {
            namespaceStack.pop()
            console.log(getPadding() + '}')
        }

    })
    .catch(err => {
        console.log(err, err.stack)
    })
