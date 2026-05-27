# QuantGuide Question

## 1027. Horse Racing

**Metadata**

- ID: `lrstWB8y25qg4isC6rxT`
- URL: https://www.quantguide.io/questions/horse-racing
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Optiver, Jane Street, SIG, Virtu Financial, IMC, Goldman Sachs, TransMarket Group
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 6
- Last Edited: 2023-11-8 10:03:24 America/New_York
- Last Edited By: Gabe

### 题干

There are 25 horses, each of which runs at a distinct and constant speed. The track has five lanes, and thus can race at most five horses at once. By simply racing different sets of horses and observing the placing of the horses within those races without access to a stopwatch, what is the minimum number of races needed to uniquely identify the three fastest horses?

### Hint

To find the three fastest horses, all horses need to be tested. A natural first step will then be to divide the horses into five racing groups labeled 1-5, 6-10, 11-15, 16-20, and 21-25.

### 解答

To find the three fastest horses, all horses need to be tested. A natural first step will then be to divide the horses into five groups labeled 1-5, 6-10, 11-15, 16-20, and 21-25. After these five races, we have the order of the horses within each group. Without loss of generality, assume the order within each group follows the order of the numbers (e.g., 6 is the fastest and 10 is the slowest within the 6-10 group). Therefore, the five fastest horses are 1, 6, 11, 16, and 21. We can eliminate the last two horses from each group since they cannot possibly be within the top three. We will then race the top five horses to establish the fastest horse. Again, assume the order of this group follows the order of the numbers (e.g., 1 is the fastest and 21 is the slowest). This tells us that from the first group 1-5, only 2 and 3 are in the running for second and third; from the second ground 6-10, only 6 and 7 are in the running for second and third; and from the third group 11-15, only 11 is in the running for second or third. This is because if the fastest horse within a group ranks second or third, then only one or no other horses within that group can be in the top three, respectively. Hence, the last group will race 2, 3, 6, 7, and 11, for a total of 7 races.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7"
    ],
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "IMC"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "lrstWB8y25qg4isC6rxT",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 10:03:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8335886,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Horse Racing",
    "topic": "brainteasers",
    "urlEnding": "horse-racing",
    "version": 6
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "IMC"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "medium",
    "id": "lrstWB8y25qg4isC6rxT",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Horse Racing",
    "topic": "brainteasers",
    "urlEnding": "horse-racing"
  }
}
```
