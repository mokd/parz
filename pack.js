const { readFileSync, copyFileSync, writeFileSync } = require('fs');

const trimPackageJson = (packageJson) => {
    const removeProperties = () => {
        const toBeRemoved = new Set(['devDependencies', 'scripts'])
        const trimmedPackageJsonAsPairs = Object.entries(packageJson).filter(([key, value]) => !toBeRemoved.has(key))
        return trimmedPackageJsonAsPairs
    } 

    return Object.fromEntries(removeProperties(packageJson))
}

const main = () => {

    const fileNamesToIncludeInPackage = ['package.json', 'README.md']
    for (const fileName of fileNamesToIncludeInPackage) {
        copyFileSync(fileName, `dist/${fileName}`)
    }

    const packageJson = JSON.parse(readFileSync('package.json').toString())
    const trimmedPackageJson = JSON.stringify(trimPackageJson(packageJson), null, 2)

    writeFileSync(`dist/package.json`, trimmedPackageJson)
}   

main()