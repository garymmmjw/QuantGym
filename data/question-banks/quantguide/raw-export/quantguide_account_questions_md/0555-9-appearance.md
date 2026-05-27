# QuantGuide Question

## 555. 9 Appearance

**Metadata**

- ID: `MLAvL7DTLNI3KcoMffcL`
- URL: https://www.quantguide.io/questions/9-appearance
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Marshall Wace, Akuna
- Source: mw
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-5 10:36:26 America/New_York
- Last Edited By: Gabe

### 题干

How many times does the digit $9$ occur when counting $1$ to $1000$? Note that the number $919$, for example, would count as $2$ $9$s.

### Hint

The first thing is to count the number of times $9$ appears in $1-99$. Can you use this to account for the different cases of the starting digit?

### 解答

The first thing is to count the number of times $9$ appears in $1-99$. Then, we can multiply this by $10$, as there are $10$ starting digits $0-9$ that can go in front of this. A starting digit of $0$ here really means that the number is less than $100$. Afterwards, we can add in $100$ $9$s afterwards for the $900$s to account for the starting digit of $9$.

$$$$

$9$ occurs in each of $9,19,\dots, 89$ once, yielding $9$ $9$s. Afterwards, $90-99$ has $11$ $9$s, as $99$ counts as $2$. Therefore, in $1-99$, the digit $9$ occurs $20$ times. Thus, the answer is $10 \cdot 20 + 100 = 300$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "300"
    ],
    "companies": [
      {
        "company": "Marshall Wace"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "MLAvL7DTLNI3KcoMffcL",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:36:26 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4435855,
    "source": "mw",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "9 Appearance",
    "topic": "brainteasers",
    "urlEnding": "9-appearance",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Marshall Wace"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "easy",
    "id": "MLAvL7DTLNI3KcoMffcL",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "9 Appearance",
    "topic": "brainteasers",
    "urlEnding": "9-appearance"
  }
}
```
