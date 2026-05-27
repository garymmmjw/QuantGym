# QuantGuide Question

## 335. Counting Odds

**Metadata**

- ID: `Ier2zdFp4dk1dcw7PxjH`
- URL: https://www.quantguide.io/questions/counting-odds
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

How many odd numbers from 1 to 2023, inclusive, are divisible by 3?

### Hint

Performing an operation (addition, subtraction, etc.) on each term within a finite sequence does not affect the length of the sequence.

### 解答

The sequence of numbers within our range that are divisible by three are $3, 6, ..., 2022$. Every other term in this sequence will be even since adding an odd number to $x$ flips whether or not it is odd or even. Thus, the new sequence in consideration is $3, 9, ..., 2019$. Note that the difference between each term is six, which is intuitive since we are skipping every other multiple of three. Adding 3 to each term, the sequence becomes $6, 12, ..., 2022$. Dividing each term by 6, the sequence becomes $1, 2, ..., 337$. Hence, there are 337 odd numbers from 1 to 2023.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "337"
    ],
    "difficulty": "medium",
    "id": "Ier2zdFp4dk1dcw7PxjH",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2579296,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Counting Odds",
    "topic": "brainteasers",
    "urlEnding": "counting-odds"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "Ier2zdFp4dk1dcw7PxjH",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Counting Odds",
    "topic": "brainteasers",
    "urlEnding": "counting-odds"
  }
}
```
