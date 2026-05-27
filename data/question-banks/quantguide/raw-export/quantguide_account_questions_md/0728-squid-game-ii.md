# QuantGuide Question

## 728. Squid Game II

**Metadata**

- ID: `TjdRz7Tmbe4BFe3GcPGn`
- URL: https://www.quantguide.io/questions/squid-game-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Virtu Financial
- Source:  
- Tags: Combinatorics, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-27 16:39:28 America/New_York
- Last Edited By: Gabe

### 题干

$$10$ contestants are arranged into a line on a bridge and in front of them lay ten left tiles and ten right tiles side by side. In order to cross the bridge, the contestants must cross $10$ tiles, and at each step, the person in front must pick either the left or right tile to step on. However, for each left & right tile pair, there is exactly one sturdy tile and one faulty tile, but the contestants cannot tell them apart. The contestants cross the bridge in their assigned order with the first person picking either the left or right tile, and continuing to lead unless either a faulty tile is picked (resulting in elimination) or person one reaches the other side. If the first person is eliminated before reaching the other side, the person second in line assumes the lead picking until he/she is eliminated (or reaches the other side), and so on. The winner of the game is the $\textit{first}$ person to reach the other side. Let $p_i$ be the probability that the $i$th contestant in the line wins. Find ${ \underset i \sup} \hspace{3pt} p_i$.

### Hint

The probability of a person $i$ winning is equal to the probability of everyone before person $i$ failing at some point, and person $i$ getting the remaining ones correct. 

### 解答

Let's start with person $1$. We know that since they are leading, they must get everything right in order to be the first one across so $$\mathbb{P}[\text{1 win}] = \frac{1}{2^{10}}$$ Next, the only way person $2$ can win is if person $1$ is eliminated before reaching the end, and person $2$ gets the remaining tiles correct. So, suppose person $1$ is eliminated at tile $k \in \Z$ where $1 \leq k \leq 10$. The probability of person $1$ making to tile $k$ is $$\underbrace{\left(\frac{1}{2}\right)^{k-1}}_{\text{k-1 correct}} *  \underbrace{\frac{1}{2}}_{\text{last incorrect}}$$ so then the probability of person $2$ winning is getting all remaining ones correct so we have $\mathbb{P}[\text{2 win} | \text{1 ends at k} ] = (\frac{1}{2})^{10-k}$. 
$$$$
Applying conditional probability, we observe that 

$$\mathbb{P}[\text{2 win}] = \sum_{k=1}^{10}  \mathbb{P}[\text{2 win} | \text{1 ends at k} ] \mathbb{P}[\text{1 ends at k}] = \sum_{k=1}^{10}\left(\frac{1}{2}\right)^{10-k}
\left(\frac{1}{2}\right)^{k} = 10 * \left(\frac{1}{2}\right)^{10}$$

Starting to generalize, we consider $\mathbb{P}[\text{3 win}]$ and like before, $3$ can win only if both person $1$ and $2$ are eliminated before reaching the end $\textbf{and}$ person 3 gets the remaining correct. Analyzing as before, let's suppose person $1$ makes it to tile $i$ and person $2$ makes it to tile $j$ with $i < j$ and $i, j \in \Z$ where $1 \leq i, j, \leq 10$. 

$$$$

It follows from the previous argument that $\mathbb{P}[\text{1 ends at i}] = \left(\frac{1}{2}\right)^i$ and $\mathbb{P}[\text{2 ends at j} | \text{1 ends at i} ] = (\frac{1}{2})^{j-i}$. Now, we see that $$P[\text{3 win}] = \sum_{i=1}^{10} \sum_{j = i+1} ^ {10} \mathbb{P}[\text{3 win} | \text{2 ends at j}] P[\text{2 ends at j} | \text{1 ends at i}] P[\text{1 ends at i}] = {10 \choose 2} (\frac{1}{2})^{10}$$ The core idea here is that if we want to determine the $\mathbb{P}[\text{i win}]$ this is equivalent to figuring how many ways you can arrange the $i-1$ people before $i$ to fail. Each of these outcomes has equal probability mass of $(\frac{1}{2})^{10}$. 
$$$$
Thus, we have that $\mathbb{P}[\text{i win}] = {10 \choose i-1} (\frac{1}{2})^{10}$ and we know that ${10 \choose i-1}$ is maximized when $i-1 =5 \implies$ person $6$ has the highest probability of winning with a probability of $$\displaystyle{10 \choose 6-1} \left(\frac{1}{2}\right)^{10} = \frac{252}{1024} = \dfrac{63}{256}$$



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "63/256"
    ],
    "companies": [
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "TjdRz7Tmbe4BFe3GcPGn",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-27 16:39:28 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5946933,
    "source": " ",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Squid Game II",
    "topic": "probability",
    "urlEnding": "squid-game-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "medium",
    "id": "TjdRz7Tmbe4BFe3GcPGn",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Squid Game II",
    "topic": "probability",
    "urlEnding": "squid-game-ii"
  }
}
```
