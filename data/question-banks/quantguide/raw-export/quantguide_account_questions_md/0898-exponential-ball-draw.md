# QuantGuide Question

## 898. Exponential Ball Draw

**Metadata**

- ID: `qFkffezdCMXYcPX4Nz87`
- URL: https://www.quantguide.io/questions/exponential-ball-draw
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 4
- Companies: WorldQuant
- Source: WorldQuant 
- Tags: Games
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:10:24 America/New_York
- Last Edited By: Gabe

### 题干

There are $100$ balls in an urn. Alice and Bob pick the balls in turn, for each round they can pick $2^k$ balls for any choice of $k \geq 0$ as long as there are at least that many balls remaining. Whoever draws the last remaining ball in the urn loses. Alice can choose whether to go first or second. Let $p$ be the position of Alice ($p = 1$ if she should go first, $p = 2$ if she should go second). Let $b$ be the 
maximum number of balls Alice should select on her first turn if Bob chooses $32$ balls on his first turn. Find $100p + b$.

### Hint

If Alice can leave $3m+1$ balls in the urn for an integer $m$ for Bob to select from, she will have a winning strategy. 

### 解答

If Alice can leave $3m+1$ balls in the urn for an integer $m$ for Bob to select from, she will have a winning strategy. As $100 = 3(33) + 1$, she should let Bob go first. This means $p = 2$. Once Bob selects, Alice can always leave $3x+1$ balls for some integer $x$ for Bob to select from. This is because if Bob selects $2^k = (3-1)^k = 3n + (-1)^k$ balls for an integer $n$, given that there are already $3m+1$ balls in the urn for Bob to select from, then there would now be $$3(m - n) + 1 - (-1)^k = 3m' + 1 + (-1)^{k+1}$$ remaining balls for an integer $m'$. Thus, you should pick $2^y$ balls, where $y \equiv k+1 \hspace{3pt} \text{mod} \hspace{3pt} 2$ This would cancel out the $(-1)^{k+1}$ term at back.

$$$$

All of the above implies that the strategy for Alice is to let Bob go first. If Bob selects $2^k$, then Alice should select $2^{k+1}$, if possible. If that isn't possible based on how many balls remain, Alice should select a smaller exponent equal in parity to $2^{k+1}$ i.e. $2^{k-1}, 2^{k-3}, \dots$ that is possible to select. In our scenario here, since Bob selects $32$ on his first turn, there are $68$ left, so Alice should select $64$ balls, as that is still possible. This means $b = 64$, so our answer is $100 \cdot 2 + 64 = 264$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "264"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "qFkffezdCMXYcPX4Nz87",
    "internalDifficulty": 4,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:10:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7362462,
    "source": "WorldQuant ",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Exponential Ball Draw",
    "topic": "brainteasers",
    "urlEnding": "exponential-ball-draw"
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "hard",
    "id": "qFkffezdCMXYcPX4Nz87",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Exponential Ball Draw",
    "topic": "brainteasers",
    "urlEnding": "exponential-ball-draw"
  }
}
```
