# QuantGuide Question

## 66. Cats and Dogs I

**Metadata**

- ID: `ztdrq5HJfuhmbmwZQJNl`
- URL: https://www.quantguide.io/questions/cats-and-dogs
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Events
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-1 09:07:05 America/New_York
- Last Edited By: Gabe

### 题干

Six dogs and six cats are sitting at a circular table uniformly at random. Find the probability that there are at least four dogs in a row somewhere in the circle.

### Hint

Label the seats $1-12$. Saying that there are at least 4 dogs in a row somewhere is equivalent to saying that at some position, reading the animals off clockwise and abbreviating dog as D and cat as C, we have the sequence CDDDD. 

### 解答

Label the seats $1-12$. Saying that there are at least 4 dogs in a row somewhere is equivalent to saying that at some position, reading the animals off clockwise and abbreviating dog as D and cat as C, we have the sequence CDDDD. Let $A_i$ be the event that this happens starting from position $i$ going clockwise, we want to find $\displaystyle \mathbb{P}\left[\bigcup_{i=1}^{12} A_i\right]$. Note that the $A_i$ events are disjoint because it is impossible for more than one of them to occur since we would either have cats interfering with the dogs mid-sequence or they are completely separate sequences, which is not possible due to there only being $6$ dogs. Therefore, the probability of the union is the sum of the probabilities and we get that our probability of interest is $\displaystyle \sum_{i=1}^{12} \mathbb{P}[A_i]$. Further note that each of the spots are exchangeable (we assigned the labels arbitrarily), so this sum is just $12\mathbb{P}[A_i]$. All that is left is to compute $\mathbb{P}[A_i]$.

$$$$

We want the probability of the sequence CDDDD, which can occur in $6 \cdot 6 \cdot 5 \cdot 4 \cdot 3$ ways. The total number of ways to assign animals to those 5 spots is $12 \cdot 11 \cdot 10 \cdot 9 \cdot 8$. Therefore, $\mathbb{P}[A_1] = \dfrac{6 \cdot 6 \cdot 5 \cdot 4 \cdot 3}{12 \cdot 11 \cdot 10 \cdot 9 \cdot 8} = \dfrac{1}{44}$. Therefore, our probability of interest is $\dfrac{12}{44} = \dfrac{3}{11}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/11"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ztdrq5HJfuhmbmwZQJNl",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-1 09:07:05 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 466780,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Cats and Dogs I",
    "topic": "probability",
    "urlEnding": "cats-and-dogs",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "ztdrq5HJfuhmbmwZQJNl",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Cats and Dogs I",
    "topic": "probability",
    "urlEnding": "cats-and-dogs"
  }
}
```
