# QuantGuide Question

## 797. Even Blocks

**Metadata**

- ID: `W7Z6LxOqunHnJ4rTnyGf`
- URL: https://www.quantguide.io/questions/even-blocks
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: AIME
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:57:53 America/New_York
- Last Edited By: Gabe

### 题干

Hannah has 12 blocks, 2 each of 6 distinct colors. She randomly arranges the blocks in a straight line. What is the probability that there are an even number of blocks between every identically colored pair of blocks?

### Hint

Notice that, if, say, a red block is in an odd-numbered slot, then the other red block must be in an even-numbered slot.

### 解答

Let's number the 12 slots where the blocks can be placed from 1-12. Notice that, if, say, a red block is in an odd-numbered slot, then the other red block must be in an even-numbered slot. Hence, there are $6! \cdot 6!$ ways to order the 12 blocks such that there are an even number of blocks between every identically colored pair of blocks. Since there are a total of $12! / 2^6$ ways to order the blocks with no condition in place, our probability is $\frac{6! \cdot 6! \cdot 2^6}{12!} = \frac{16}{231}$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "16/231"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "W7Z6LxOqunHnJ4rTnyGf",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:57:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6513529,
    "source": "AIME",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Even Blocks",
    "topic": "probability",
    "urlEnding": "even-blocks"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "W7Z6LxOqunHnJ4rTnyGf",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Even Blocks",
    "topic": "probability",
    "urlEnding": "even-blocks"
  }
}
```
