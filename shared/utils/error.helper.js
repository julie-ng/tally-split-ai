
/**

[ { "expected": "object", "code": "invalid_type", "path": [ "items" ], "message": "Invalid input: expected object, received array" } ]


 */


 function formatZodError (errorArray) {
   const errors = []
   for (const err of errorArray) {
     errors.push(
       code: err.code,
       prop: err.path.join('.'),
       message: err.message
     )
   }
 }


 export const errorUtils = {
   formatZodError
 }
