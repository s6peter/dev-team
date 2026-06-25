import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('MyTable')

def create_item(event, context):
    body = json.loads(event['body'])
    id = body['id']
    item = {'id': id, 'data': body['data']}
    
    table.put_item(Item=item)

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Item created', 'item': item})
    }
