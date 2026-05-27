# QuantGuide Question

## 32. Intersecting Chords

**Metadata**

- ID: `qB82CtrVE5YbJwFv4Ykf`
- URL: https://www.quantguide.io/questions/intersecting-chords
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Virtu Financial, Hudson River Trading
- Source: N/A
- Tags: Continuous Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-4 22:59:32 America/New_York
- Last Edited By: Gabe

### 题干

$$10$ chords with uniformly randomly chosen endpoints are drawn on a circle. What is the expected number of intersections?

### Hint

Consider indicator random variables on each pair of chords.

### 解答

Consider indicator random variables on each pair of chords. Any pair of chords will have a total of $4$ endpoints, and each of the ${4\choose2} = 6$ ways to pair them up into chords are equally likely, of which only $2$ result in an intersection. Alternatively, this can be seen by choosing two points for the first chord and computing the probability that two randomly chosen points would lie on the same side of the chord via integrating over the arc angle between the points of the first chord. Hence for each of the ${10\choose2} = 45$ pairs of chords, there are $1/3$ expected intersections for a total number of $15$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "15"
    ],
    "companies": [
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "qB82CtrVE5YbJwFv4Ykf",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 22:59:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 215144,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Intersecting Chords",
    "topic": "probability",
    "urlEnding": "intersecting-chords",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "medium",
    "id": "qB82CtrVE5YbJwFv4Ykf",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Intersecting Chords",
    "topic": "probability",
    "urlEnding": "intersecting-chords"
  }
}
```
