La Vie de la Loi(Français)
===

**La Vie de la Loi est un outil de visualisation de textes législatifs qui repose sur les APIs de légifrance.**

Ce projet permet de mettre les textes présents sur légifrance sous un ofrmat qui peut facilement être représenté graphiquement. La représentation acutellement est celle de "The Making of a law" de Gregor Aisch. Cette visualisation permet de voir facilement les évolutions d'un texte et de naviguer à traver ce dernier.
Initialement prévu pour une loi précise, nous proposons de l'utiliser pour une pluralité de textes. 


## Utilisation

**Ce programme s'appuie sur les API de legifrance, pour les utiliser, créer vous un compte sur le portail PISTE**
- Rendez-vous sur le site : https://piste.gouv.fr/component/apiportal/registration
- Créez une application en mode Sandbox pour pouvoir accèder à l'API de Legifrance : https://piste.gouv.fr/index.php?option=com_apiportal&view=apitester&usage=api&apitab=tests&apiName=DILA+-+L%C3%A9gifrance+Beta&apiId=404c503e-d69d-4f2d-9909-00d33bd56701&managerId=2&type=rest&apiVersion=1.6.2.5&Itemid=265&swaggerVersion=2.0&lang=fr 
- Une fois votre application créée, cliquer sur "Cliquer ici pour accéder à la page de consentement" et valider les CGU des APIs de la DILA dans leur version "Production" et dans leur version "Sandbox" 
- Séléctionnez ensuite les APIs de Legifrance de votre application "Sandbox"
- Remplacez dans le fichier "carto2.py" les valeurs correspondant au Client ID et à la clé secrète OAuth de votre application 


**Une fois le fichier configurer**
Pour créer un fichier représentable pour la visualisation, lancer la commande:
	- rendez-vous sur la page légifrance du texte législatif que vous souhaitez visualiser
	- l'identifiant de ce texte est la chaine de caractères qui apparait après "/id/" dans l'URL
	- par exemple l'URL de la loi du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés est "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000886460/", son identifiant est "JORFTEXT000000886460"
	- taper la commande 'python3 carto2.py --o nom_du_fichier.json --l "identifiant_du_texte"'
	 
	 


## Contribuer

