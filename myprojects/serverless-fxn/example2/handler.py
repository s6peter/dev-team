# import json
# from datetime import datetime

# def hello(event, context):
#     # Get the current time in ISO format
#     current_time = datetime.now().isoformat()

#     # Return only the current time in the response body
#     return {
#         "statusCode": 200,
#         "body": json.dumps({"current-time": current_time})
#     }


import json
from datetime import datetime

def hello(event, context):
    # Get the current time in ISO format
    body = {
        "message": "Hello, Codility!",
        
    }

    # Return only the current time in the response body
    return {
        "statusCode": 200,
        "body": json.dumps({"message": body})
    }
