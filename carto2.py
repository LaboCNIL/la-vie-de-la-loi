from requests_oauthlib import OAuth2Session
from oauthlib.oauth2 import BackendApplicationClient
import json
from pipe import *
import sys
import re
import copy
from datetime import datetime


# This information is obtained upon registration of a new GitHub
client_id = #Get from PISTE
client_secret = #Get from PISTE
authorization_base_url = 'https://sandbox-oauth.piste.gouv.fr/api/oauth/authorize'
token_url = 'https://sandbox-oauth.piste.gouv.fr/api/oauth/token'
scope = 'openid'
path = '/dila/legifrance-beta/lf-engine-app'
host = 'https://sandbox-api.piste.gouv.fr'



#Optional parameters
legi_id = "JORFTEXT000000864438"
output_file = "data.json"
start_year= 1800
end_year = 2023
section_number = 1



def get_token():
    client = BackendApplicationClient(client_id=client_id)
    oauth = OAuth2Session(client=client)
    token = oauth.fetch_token(token_url=token_url, client_id=client_id,
        client_secret=client_secret)
    print(token)
    return token

def get_resource(token,data,resource):
    #print(data)
    piste = OAuth2Session(client_id, token=token)
    headers = {"Content-Type": "application/json"}
    r = piste.post(host+path+resource, data=json.dumps(data), headers=headers)
    #print(r.content)
    return json.loads(r.content.decode('utf-8'))



def get_versions_date(token, text_id):
    #today = datetime.today().strftime('%Y-%m-%d')
    dates = []
    data ={ 
        "endYear": end_year,
        "startYear": start_year,
        "textCid": text_id
    }
    result = get_resource(token,data,'/chrono/textCid')
    groups = result["regroupements"]
    for group in groups:
        versions = group["versions"]
        for key in versions:
            version = versions[key]
            timestamp = version["dateDebut"]/1000
            date = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d')
            #print( date )
            dates.append(date)
    return dates
        





def get_articles(article_list,has_subsection = True):
    global section_number
    result = []
    last_section_nb = 0
    for element in article_list|where(lambda x: ((not "etat" in x) or (x["etat"] != "ABROGE")) ) :
        article = {}
        if ( "num" in element) and (element["num"] != None) and (not element["num"].startswith("Annexe")):
            number = element["num"]
        else :
            number = "0"
        if has_subsection:
            article["section"] = section_number
        else :
            article["section"] = number
        if "title" in element:
            article["title"] = element["title"]
        else :
            article["title"] = "Article " + str(number)
        article["paragraphs"] = []
        article["id"] = str(number)
        article["no"] = float(number.split(" ")[0].replace('-','.',1).replace('-','').replace('L','').replace('R','').replace('D','').replace('*','').replace('A','')) #not very clean, should find a better way to sort/filter articles
        paragraphs = element["content"].replace('"','\"').split("</p>")|map(lambda x : re.sub('<[^<]+?>', '',x))|where(lambda x: x != "")
        for num, elt in enumerate(paragraphs):
            paragraph = {
                "no" : num+1,
                "content" : elt,
                "content_length" : len(elt)
            }
            article["paragraphs"].append(paragraph)
        result.append(article)
    return sorted(result, key = lambda x: x.get('no'))


def get_first_article_number(section):
    result =0
    while len(section["sections"])> 0 : 
        section = section["sections"][0]
    result = section["articles"][0]["num"]
    if result is None:
        return 0
    else:
        if '-' in result :
            result = result.split("-")[0]   
        return result

def parse_sub_sections(section) :
    global section_number
    result = []
    if len(section["sections"]) >0 :
        for sub_section in section["sections"]|where(lambda x: (((not "etat" in x) or (x["etat"] != "ABROGE")) and (x["title"]!= "Annexe")) ) :
            result = result + parse_sub_sections( sub_section)
    if len(section["articles"]) > 0:
        result = result + get_articles(section["articles"])
        section_number +=1
    return result 



def get_text_version(token, text_id, date):
    global section_number
    result = []
    section_number = 1
    data = {
        "date": date,
        "textId": text_id
    }
    print("Get text version " + text_id + " at time " + date )
    resource = get_resource(token,data,"/consult/legiPart")
    #print(resource)
    sections = resource["sections"]    

    if len(sections) > 0:
        for section in sections|where(lambda x: (((not "etat" in x) or (x["etat"] != "ABROGE")) and(x["title"]!= "Annexe") )) | sort(key = lambda x: get_first_article_number(x)):
            result = result + parse_sub_sections(section)
    else :
        articles = resource["articles"]
        result = get_articles(articles,False)
        return result

    return result

def print_help_message():
    """ prints out the help message in the case that too few arguments are mentioned """
    print("Should use carto with at least two arguments: \n" \
          "-output or --o: the output json file\n" \
          "-legid or --l: the legifrance id of the text (e.g. JORFTEXT000000864438 for Ficoba which is the default, JORFTEXT000000886460 for LIL, JORFTEXT000041869923 for SI Covid...)\n" \
          "Optional arguments: \n" \
           " -from: from which year you'd like to see modification of the law \n"\
           " -to: until which year you'd like to see modification of the law" )


def post_process(text_list) :
    text_list = text_list|sort(key = lambda x:x["source"])

    for i in range(1,len(text_list)):
        #First we mark the articles that are new
        for j in range(len(text_list[i]["articles"])):
            if text_list[i]["articles"][j]["title"] not in (text_list[i-1]["articles"]|map(lambda x : x["title"]))  :
                text_list[i]["articles"][j]["status"] = "new"
        #Then the articles that have been deletec
        for j in range(len(text_list[i-1]["articles"])) :
            if ( ("status" not in text_list[i-1]["articles"][j] or text_list[i-1]["articles"][j]["status"] != "deleted") and
                text_list[i-1]["articles"][j]["title"] not in (text_list[i]["articles"]|map(lambda x : x["title"])))  :
                #Need to copy the value, note the ref
                del_article = copy.deepcopy(text_list[i-1]["articles"][j]) 
                del_article["status"] = "deleted"
                text_list[i]["articles"].append(del_article)

    for i in range(0,len(text_list)):
        text_list[i]["articles"] = text_list[i]["articles"]| sort(key = lambda x: x["no"])

    return text_list






def create_json():
    #print(output_file)
    text_versions = []
    index = 0
    start_date = str(start_year) +"-01-01"
    end_date = str(end_year) +"-12-31"
    token = get_token()
    dates = get_versions_date(token,legi_id)
    print(dates)
    for date in dates|where(lambda x : start_date < x < end_date) :
        version = {
            "source" : date,
            "id" : legi_id,
            "published" : date,
            "link" : "https://www.legifrance.gouv.fr/loda/id/" + legi_id + "/" + date,
            "articles" : get_text_version(token, legi_id,date)| sort(key = lambda x:x["section"])
        }
        text_versions.append(version)

    text_versions = post_process(text_versions)
    #print(json.dumps(result))
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(text_versions, f)
    #get_resource(token,json.dumps(data),'/chrono/textCid')



def main(argv):
    global output_file, legi_id, start_year, end_year
    """ main helper function, reads command-line arguments and launches crawl """
    # filters out bad arguments
    if len(argv) < 2 :
        print_help_message()
        return
    
    
    # overwrites the default preferences based on command-line inputs
    for i in range(1, len(argv), 2):
        if argv[i] == "-output" or argv[i] == "--o":
            output_file = argv[i+1].lower() 
        if argv[i] == "-legid" or argv[i] == "--l":
            legi_id = argv[i+1]
        if argv[i] == "-from" :
            start_year = argv[i+1]
        if argv[i] == "-to" :
            end_year = argv[i+1]
    

    create_json()


if __name__ == "__main__":
    main(sys.argv)




