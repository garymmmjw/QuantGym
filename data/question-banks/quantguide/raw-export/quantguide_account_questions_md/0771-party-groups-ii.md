# QuantGuide Question

## 771. Party Groups II

**Metadata**

- ID: `qJCCu11HbT7ryIlfQGAA`
- URL: https://www.quantguide.io/questions/party-groups-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Maven Securities, Jane Street
- Source: edited kaushik
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-4 18:59:52 America/New_York
- Last Edited By: Gabe

### 题干

There are $50$ guests at a party and they are making groups for a game. To do this they each write their name on a piece of paper and put it into a hat. One by one, each guest picks a name from the hat. Each guest will be a part of a group with the guest they pulled the name out of from the hat. If a guest pulls out their own name, they are in a group all by themselves. If Guest A pulls out Guest B's name, Guest B pulls out Guest C's name, and Guest C pulls out Guest A's name, they are all a part of the same closed group and no one else will be able to join them. What is the average size of a group? Round your answer to the nearest tenth. 

### Hint

You discovered the average number of groups in Part I of the question. What is the intuitive answer, and how can you show it is correct?

### 解答

An intuitive answer is that we discovered in Party Guests I that there are $\displaystyle \sum_{k=1}^{50} \dfrac{1}{k}$ groups on average, and since there are $50$ people total, the average size of a given group is $\dfrac{50}{\displaystyle \sum_{k=1}^{50} \dfrac{1}{k}} \approx 11.1$. This is indeed correct. We show this using the "cycles" interpretation from the previous part of the question. $$$$ There are $n!/k$ $k-$cycles among the permutations, while there are $n! \cdot H_n$ total cycles in all of the permutations (adding up the cycles of each length), where $H_n = \displaystyle \sum_{k=1}^n \dfrac{1}{k}$. Therefore, the probability that a given cycle is a $k-$cycle is $\dfrac{n!/k}{n!H_n} = \dfrac{1}{kH_n}$. Therefore, the expected length of a cycle would be $$\displaystyle \sum_{k=1}^n k \cdot \dfrac{1}{kH_n} = \dfrac{n}{H_n}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11.1"
    ],
    "companies": [
      {
        "company": "Maven Securities"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "qJCCu11HbT7ryIlfQGAA",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 18:59:52 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6299952,
    "source": "edited kaushik",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Party Groups II",
    "topic": "probability",
    "urlEnding": "party-groups-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Maven Securities"
      },
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "qJCCu11HbT7ryIlfQGAA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Party Groups II",
    "topic": "probability",
    "urlEnding": "party-groups-ii"
  }
}
```
