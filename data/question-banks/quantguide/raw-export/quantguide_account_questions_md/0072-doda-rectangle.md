# QuantGuide Question

## 72. Doda Rectangle

**Metadata**

- ID: `LcG35VwmzCBHxZ58x3mn`
- URL: https://www.quantguide.io/questions/doda-rectangle
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: AIME
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:56:39 America/New_York
- Last Edited By: Gabe

### 题干

Each vertex of a regular dodecagon is randomly colored either red or blue. A "dodeca-rectangle" is defined as a rectangle whose 4 identically-colored vertices belong to the regular dodecagon. Compute the probability that a dodeca-rectangle cannot be formed. 

### Hint

There are three cases to consider: (1) there are zero same-colored opposing vertices, (2) there is exactly one pair of same-colored opposing vertices, and (3) there is exactly 1 red-red opposing pair of vertices and 1 blue-blue opposing pair of vertices. 


### 解答

There are $2^{12}$ ways to color the 12 vertices. We can break down the solution into the following three cases: (1) there are zero same-colored opposing vertices, (2) there is exactly one pair of same-colored opposing vertices, and (3) there is exactly 1 red-red opposing pair of vertices and 1 blue-blue opposing pair of vertices. 

$$$$

Case 1: We set colors for vertices 1-6; there are $2^6$ ways to do so. Then, vertices 7-12 are set. There are $2^6$ ways to have zero same-colored opposing vertices.  $$$$
Case 2: We set colors for vertices 1-6; there are $2^6$ ways to do so. We choose 1 of vertices 7-12 to color identically to the opposite vertex; there are $\binom{6}{1} = 6$ ways to do so. There are $6 \cdot 2^6$ ways to have exactly one pair of same-colored opposing vertices. $$$$
Case 3: We set colors for vertices 1-6; there are $2^6$ ways to do so. We then choose 2 of the remaining vertices to assign as same-colored to the opposing vertex. Half of such arrangements end up with two pairs of the same color. There are $\binom{6}{2} \cdot \frac{1}{2} \cdot 2^6 = 480$ ways to have exactly one pair of same-colored opposing vertices. $$$$

Adding up all the cases, we find that the probability is $\frac{928}{2^12} = \frac{29}{128}$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "29/128"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "LcG35VwmzCBHxZ58x3mn",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:56:39 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 498451,
    "source": "AIME",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Doda Rectangle",
    "topic": "probability",
    "urlEnding": "doda-rectangle"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "LcG35VwmzCBHxZ58x3mn",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Doda Rectangle",
    "topic": "probability",
    "urlEnding": "doda-rectangle"
  }
}
```
